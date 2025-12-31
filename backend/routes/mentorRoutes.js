const express = require('express');
const router = express.Router();
const { 
    getAllMentors, 
    getMentorSectors, 
    getMentorLanguages, 
    getMentorById 
} = require('../controllers/mentorController');

// @route   GET api/mentors
// @desc    Ottieni la lista di tutti i mentor
// @access  Pubblico
router.get('/', getAllMentors);

// @route   GET api/mentors/sectors
// @desc    Ottieni la lista di tutti i settori unici dei mentor
// @access  Pubblico
router.get('/sectors', getMentorSectors);

// @route   GET api/mentors/languages
// @desc    Ottieni la lista di tutte le lingue uniche dei mentor
// @access  Pubblico
router.get('/languages', getMentorLanguages);

// @route   GET api/mentors/:id
// @desc    Ottieni il profilo di un singolo mentor
// @access  Pubblico
router.get('/:id', getMentorById);

module.exports = router;
