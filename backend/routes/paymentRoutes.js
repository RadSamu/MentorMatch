const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { mockPayment } = require('../controllers/paymentController');

/**
 * @route   POST /api/payments/mock-pay
 * @desc    Simula il pagamento di una prenotazione
 * @access  Private (Mentee)
 */
router.post('/mock-pay', authMiddleware, mockPayment);

module.exports = router;