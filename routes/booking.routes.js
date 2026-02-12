import express from 'express';
import {
  getAvailableSlots,
  createBookingOrder,
  verifyBookingPayment,
  getBookingDetails,
  getPublicSettings 
} from '../controllers/booking.controller.js';

const router = express.Router();

// Public booking routes
router.get('/settings', getPublicSettings);  
router.get('/slots', getAvailableSlots);
router.post('/create-order', createBookingOrder);
router.post('/verify-payment', verifyBookingPayment);
router.get('/:bookingId', getBookingDetails);

export default router;