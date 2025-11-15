import axios from "axios"
import Movie from "../models/Movie.js";
import Show from "../models/Show.js";
import Release from "../models/Release.js";
import { inngest } from "../inngest/index.js";

// API to get now playing movies from TMDB API
export const getNowPlayingMovies = async (req, res)=>{
    try {
        const { data } = await axios.get('https://api.themoviedb.org/3/movie/now_playing', {
            headers: {Authorization : `Bearer ${process.env.TMDB_API_KEY}`}
        })

        const movies = data.results;
        res.json({success: true, movies: movies})
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: error.message})
    }
}

// API to add a new show to the database
export const addShow = async (req, res) =>{
    try {
        const {movieId, showsInput, showPrice} = req.body

        // Input validation
        if (!movieId) {
            return res.status(400).json({ success: false, message: "Movie ID is required" });
        }
        if (!showsInput || !Array.isArray(showsInput) || showsInput.length === 0) {
            return res.status(400).json({ success: false, message: "Shows input is required and must be a non-empty array" });
        }
        if (!showPrice || typeof showPrice !== 'number' || showPrice <= 0) {
            return res.status(400).json({ success: false, message: "Valid show price is required" });
        }

        let movie = await Movie.findById(movieId)

        if(!movie) {
            // Fetch movie details and credits from TMDB API
            const [movieDetailsResponse, movieCreditsResponse] = await Promise.all([
                axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
            headers: {Authorization : `Bearer ${process.env.TMDB_API_KEY}`} }),

                axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
            headers: {Authorization : `Bearer ${process.env.TMDB_API_KEY}`} })
            ]);

            const movieApiData = movieDetailsResponse.data;
            const movieCreditsData = movieCreditsResponse.data;

             const movieDetails = {
                _id: movieId,
                title: movieApiData.title,
                overview: movieApiData.overview,
                poster_path: movieApiData.poster_path,
                backdrop_path: movieApiData.backdrop_path,
                genres: movieApiData.genres,
                casts: movieCreditsData.cast,
                release_date: movieApiData.release_date,
                original_language: movieApiData.original_language,
                tagline: movieApiData.tagline || "",
                vote_average: movieApiData.vote_average,
                runtime: movieApiData.runtime,
             }

             // Add movie to the database
             movie = await Movie.create(movieDetails);
        }

        const showsToCreate = [];
        showsInput.forEach(show => {
            const showDate = show.date;
            show.time.forEach((time)=>{
                const dateTimeString = `${showDate}T${time}`;
                showsToCreate.push({
                    movie: movieId,
                    showDateTime: new Date(dateTimeString),
                    showPrice,
                    occupiedSeats: {}
                })
            })
        });

        if(showsToCreate.length > 0){
            await Show.insertMany(showsToCreate);
        }

         //  Trigger Inngest event
         await inngest.send({
            name: "app/show.added",
             data: {movieTitle: movie.title}
         })

        res.status(201).json({success: true, message: 'Show Added successfully.'})
    } catch (error) {
        console.error(error);
        res.status(500).json({success: false, message: error.message})
    }
}

// API to get all shows from the database
export const getShows = async (req, res) =>{
    try {
        const shows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie').sort({ showDateTime: 1 });

        // filter unique movies that have shows
        const movieMap = new Map();
        shows.forEach(show => {
            if (show.movie && !movieMap.has(show.movie._id)) {
                movieMap.set(show.movie._id, show.movie);
            }
        });

        res.json({success: true, shows: Array.from(movieMap.values())})
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to get a single show from the database
export const getShow = async (req, res) =>{
    try {
        const {movieId} = req.params;
        
        if (!movieId) {
            return res.status(400).json({ success: false, message: "Movie ID is required" });
        }

        // get all upcoming shows for the movie
        const shows = await Show.find({movie: movieId, showDateTime: { $gte: new Date() }})

        const movie = await Movie.findById(movieId);
        
        if (!movie) {
            return res.status(404).json({ success: false, message: "Movie not found" });
        }

        const dateTime = {};

        shows.forEach((show) => {
            const date = show.showDateTime.toISOString().split("T")[0];
            if(!dateTime[date]){
                dateTime[date] = []
            }
            dateTime[date].push({ time: show.showDateTime, showId: show._id })
        })

        res.json({success: true, movie, dateTime})
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to search movies from the database
export const searchMovies = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim() === '') {
            return res.json({ success: true, movies: [] });
        }

        // Search movies by title (case-insensitive)
        const movies = await Movie.find({
            title: { $regex: query, $options: 'i' }
        }).limit(20);

        // Filter to only include movies that have upcoming shows
        const movieIds = movies.map(movie => movie._id);
        const shows = await Show.find({
            movie: { $in: movieIds },
            showDateTime: { $gte: new Date() }
        }).populate('movie');

        // Get unique movies that have upcoming shows
        const uniqueMovies = new Set();
        shows.forEach(show => {
            if (show.movie) {
                uniqueMovies.add(show.movie);
            }
        });

        res.json({ success: true, movies: Array.from(uniqueMovies) });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to get upcoming movies from database (releases)
export const getUpcomingMovies = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const pageSize = 20;
        const skip = (page - 1) * pageSize;

        // Get total count
        const totalReleases = await Release.countDocuments();
        const totalPages = Math.ceil(totalReleases / pageSize);

        // Get releases for current page
        const releases = await Release.find({})
            .sort({ release_date: 1 })
            .skip(skip)
            .limit(pageSize);

        // Transform to match expected format
        const movies = releases.map(release => ({
            id: release.movieId,
            title: release.title,
            overview: release.overview,
            poster_path: release.poster_path,
            backdrop_path: release.backdrop_path,
            release_date: release.release_date,
            vote_average: release.vote_average,
            trailerUrl: release.trailerUrl
        }));

        res.json({ 
            success: true, 
            movies: movies,
            totalPages: totalPages || 1,
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to get theaters - single dummy theater
export const getTheaters = async (req, res) => {
    try {
        // Single dummy theater
        const theaters = [
            {
                id: 1,
                name: "CinemaMax Downtown",
                address: "123 Entertainment Street, Movie City, MC 12345",
                phone: "+91 98765 43210",
                amenities: ["IMAX", "4DX", "Recliner Seats", "Dolby Atmos", "Food Court"],
                screens: 6,
                location: {
                    latitude: 30.9010,
                    longitude: 75.8573
                },
                timings: "10:00 AM - 11:00 PM",
                image: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800"
            }
        ];

        res.json({ 
            success: true, 
            theaters: theaters,
            city: "Movie City",
            state: "MC"
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}