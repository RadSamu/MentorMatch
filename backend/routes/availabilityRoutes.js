const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    createAvailability, 
    getMyAvailabilities, 
    deleteAvailability, 
    getMentorAvailabilities 
} = require('../controllers/availabilityController');

// @route   POST api/availability
// @desc    Un mentor aggiunge una sua fascia oraria
// @access  Privato (solo Mentor)
const mentorMiddleware = require('../middleware/mentorMiddleware');
router.post('/', [authMiddleware, mentorMiddleware], createAvailability);

// @route   GET api/availability/me
// @desc    Ottiene le disponibilità del mentor loggato
// @access  Privato (solo Mentor)
router.get('/me', [authMiddleware, mentorMiddleware], getMyAvailabilities);

// @route   DELETE api/availability/:id
// @desc    Un mentor cancella un suo slot di disponibilità
// @access  Privato (solo Mentor)
router.delete('/:id', [authMiddleware, mentorMiddleware], deleteAvailability);

// @route   GET /api/availability/mentor/:mentorId
// @desc    Ottiene le disponibilità per un mentor specifico (pubblico)
// @access  Pubblico
router.get('/mentor/:mentorId', getMentorAvailabilities);

module.exports = router;