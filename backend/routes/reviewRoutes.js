const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { createReview, getMentorReviews } = require('../controllers/reviewController');

// @route   POST /api/reviews
// @desc    Un mentee lascia una recensione
// @access  Privato (solo Mentee)
router.post('/', authMiddleware, createReview);

// @route   GET /api/reviews/mentor/:mentorId
// @desc    Ottiene tutte le recensioni per un mentor specifico
// @access  Pubblico
router.get('/mentor/:mentorId', getMentorReviews);

module.exports = router;