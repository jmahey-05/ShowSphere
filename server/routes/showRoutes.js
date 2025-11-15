import express from "express";
import { addShow, getNowPlayingMovies, getShow, getShows, searchMovies, getUpcomingMovies, getTheaters } from "../controllers/showController.js";
import { protectAdmin } from "../middleware/auth.js";

const showRouter = express.Router();

showRouter.get('/now-playing',protectAdmin, getNowPlayingMovies)
showRouter.post('/add', protectAdmin, addShow)
showRouter.get("/search", searchMovies)
showRouter.get("/upcoming", getUpcomingMovies)
showRouter.get("/theaters", getTheaters)
showRouter.get("/all", getShows)
showRouter.get("/:movieId", getShow)

export default showRouter;