import Booking from "../models/Booking.js"
import Show from "../models/Show.js";
import User from "../models/User.js";
import Release from "../models/Release.js";
import axios from "axios";


// API to check if user is admin
export const isAdmin = async (req, res) =>{
    res.json({success: true, isAdmin: true})
}

// API to get dashboard data
export const getDashboardData = async (req, res) =>{
    try {
        const bookings = await Booking.find({isPaid: true});
        const activeShows = await Show.find({showDateTime: {$gte: new Date()}}).populate('movie');

        const totalUser = await User.countDocuments();

        const dashboardData = {
            totalBookings: bookings.length,
            totalRevenue: bookings.reduce((acc, booking)=> acc + booking.amount, 0),
            activeShows,
            totalUser
        }

        res.json({success: true, dashboardData})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
    }
}

// API to get all shows
export const getAllShows = async (req, res) =>{
    try {
        const shows = await Show.find({showDateTime: { $gte: new Date() }}).populate('movie').sort({ showDateTime: 1 })
        res.json({success: true, shows})
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
    }
}

// API to get all bookings
export const getAllBookings = async (req, res) =>{
    try {
        const bookings = await Booking.find({}).populate('user').populate({
            path: "show",
            populate: {path: "movie"}
        }).sort({ createdAt: -1 })
        res.json({success: true, bookings })
    } catch (error) {
        console.error(error);
        res.json({success: false, message: error.message})
    }
}

// API to get upcoming movies from TMDB for adding as releases
export const getUpcomingMoviesForAdmin = async (req, res) => {
    try {
        const { page = 1 } = req.query;
        const { data } = await axios.get('https://api.themoviedb.org/3/movie/upcoming', {
            headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` },
            params: { page }
        });

        res.json({ 
            success: true, 
            movies: data.results,
            totalPages: data.total_pages,
            currentPage: data.page
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to add a release
export const addRelease = async (req, res) => {
    try {
        const { movieId } = req.body;

        if (!movieId) {
            return res.status(400).json({ success: false, message: "Movie ID is required" });
        }

        // Check if release already exists
        const existingRelease = await Release.findOne({ movieId });
        if (existingRelease) {
            return res.status(400).json({ success: false, message: "Release already exists" });
        }

        // Fetch movie details, credits, and videos from TMDB API
        const [movieDetailsResponse, movieCreditsResponse, movieVideosResponse] = await Promise.all([
            axios.get(`https://api.themoviedb.org/3/movie/${movieId}`, {
                headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
            }),
            axios.get(`https://api.themoviedb.org/3/movie/${movieId}/credits`, {
                headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
            }),
            axios.get(`https://api.themoviedb.org/3/movie/${movieId}/videos`, {
                headers: { Authorization: `Bearer ${process.env.TMDB_API_KEY}` }
            })
        ]);

        const movieApiData = movieDetailsResponse.data;
        const movieCreditsData = movieCreditsResponse.data;
        const movieVideosData = movieVideosResponse.data;

        // Find trailer URL (prefer YouTube)
        let trailerUrl = null;
        const trailer = movieVideosData.results.find(
            video => video.type === 'Trailer' && video.site === 'YouTube'
        );
        if (trailer) {
            trailerUrl = `https://www.youtube.com/watch?v=${trailer.key}`;
        }

        const releaseDetails = {
            movieId: movieId,
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
            trailerUrl: trailerUrl
        };

        const release = await Release.create(releaseDetails);

        res.status(201).json({ success: true, message: 'Release added successfully', release });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}

// API to get all releases
export const getAllReleases = async (req, res) => {
    try {
        const releases = await Release.find({}).sort({ release_date: 1 });
        res.json({ success: true, releases });
    } catch (error) {
        console.error(error);
        res.json({ success: false, message: error.message });
    }
}

// API to remove a release
export const removeRelease = async (req, res) => {
    try {
        const { movieId } = req.params;

        if (!movieId) {
            return res.status(400).json({ success: false, message: "Movie ID is required" });
        }

        const release = await Release.findOneAndDelete({ movieId });

        if (!release) {
            return res.status(404).json({ success: false, message: "Release not found" });
        }

        res.json({ success: true, message: 'Release removed successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: error.message });
    }
}