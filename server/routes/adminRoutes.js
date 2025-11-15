import express from "express";
import { protectAdmin } from "../middleware/auth.js";
import { getAllBookings, getAllShows, getDashboardData, isAdmin, getUpcomingMoviesForAdmin, addRelease, getAllReleases, removeRelease } from "../controllers/adminController.js";

const adminRouter = express.Router();

adminRouter.get('/is-admin', protectAdmin, isAdmin)
adminRouter.get('/dashboard', protectAdmin, getDashboardData)
adminRouter.get('/all-shows', protectAdmin, getAllShows)
adminRouter.get('/all-bookings', protectAdmin, getAllBookings)
adminRouter.get('/upcoming-movies', protectAdmin, getUpcomingMoviesForAdmin)
adminRouter.post('/add-release', protectAdmin, addRelease)
adminRouter.get('/all-releases', protectAdmin, getAllReleases)
adminRouter.delete('/remove-release/:movieId', protectAdmin, removeRelease)

export default adminRouter;