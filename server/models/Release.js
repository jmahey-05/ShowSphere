import mongoose from "mongoose";

const releaseSchema = new mongoose.Schema(
    {
        movieId: {type: String, required: true, unique: true},
        title: {type: String, required: true},
        overview: {type: String, required: true},
        poster_path: {type: String, required: true},
        backdrop_path: {type: String, required: true},
        release_date: {type: String, required: true},
        original_language: {type: String},
        tagline: {type: String},
        genres: {type: Array, required: true},
        casts: {type: Array, required: true},
        vote_average: {type: Number, required: true},
        runtime: {type: Number, required: true},
        trailerUrl: {type: String}, // YouTube trailer URL
    }, {timestamps: true}
)

const Release = mongoose.model('Release', releaseSchema)

export default Release;

