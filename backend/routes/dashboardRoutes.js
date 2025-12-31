const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { getDashboardStats } = require('../controllers/dashboardController');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics for the logged-in user
// @access  Private
router.get('/stats', authMiddleware, getDashboardStats);

module.exports = router;