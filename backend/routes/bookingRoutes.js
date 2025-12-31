const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createBooking, getMyBookings, cancelBooking } = require('../controllers/bookingController');

// @route   POST /api/bookings
// @desc    Un mentee prenota una sessione
// @access  Privato (solo Mentee)
router.post('/', authMiddleware, createBooking);

// @route   GET /api/bookings/me
// @desc    Ottiene gli appuntamenti dell'utente loggato
// @access  Privato
router.get('/me', authMiddleware, getMyBookings);

// @route   PUT /api/bookings/:id/cancel
// @desc    Cancella una prenotazione
// @access  Privato (Mentee o Mentor coinvolti)
router.put('/:id/cancel', authMiddleware, cancelBooking);

module.exports = router;