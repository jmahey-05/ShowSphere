import express from 'express';
import { createBooking, getOccupiedSeats } from '../controllers/bookingController.js';
import { requireAuth } from '../middleware/auth.js';

const bookingRouter = express.Router();

// Protect booking creation route - requires authentication
bookingRouter.post('/create', requireAuth, createBooking);
bookingRouter.get('/seats/:showId', getOccupiedSeats);

export default bookingRouter;