const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { register, login, getMe, forgotPassword, resetPassword } = require('../controllers/authController');

// @route   POST /api/auth/register
// @desc    Registrazione utente
// @access  Pubblico
router.post('/register', register);

// @route   POST /api/auth/login
// @desc    Autenticazione utente e ottenimento token
// @access  Pubblico
router.post('/login', login);

// @route   GET /api/auth/me
// @desc    Ottieni i dati dell'utente loggato
// @access  Privato
router.get('/me', authMiddleware, getMe);

// @route   POST /api/auth/forgot-password
router.post('/forgot-password', forgotPassword);

// @route   PUT /api/auth/reset-password/:token
router.put('/reset-password/:token', resetPassword);


module.exports = router;