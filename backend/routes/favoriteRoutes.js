const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const { 
    getFavoriteIds, 
    getFavorites, 
    addFavorite, 
    removeFavorite 
} = require('../controllers/favoriteController');

// Middleware per assicurarsi che l'utente sia un mentee
const menteeOnly = (req, res, next) => {
    if (req.user.role !== 'mentee') {
        return res.status(403).json({ msg: 'Accesso negato. Funzionalità solo per i mentee.' });
    }
    next();
};

// @route   GET /api/favorites/ids
// @desc    Ottiene gli ID di tutti i mentor preferiti per il mentee loggato
// @access  Privato (Mentee)
router.get('/ids', authMiddleware, menteeOnly, getFavoriteIds);

// @route   GET /api/favorites
// @desc    Ottiene i profili completi dei mentor preferiti
// @access  Privato (Mentee)
router.get('/', authMiddleware, menteeOnly, getFavorites);

// @route   POST /api/favorites/:mentorId
// @desc    Aggiunge un mentor ai preferiti
// @access  Privato (Mentee)
router.post('/:mentorId', authMiddleware, menteeOnly, addFavorite);

// @route   DELETE /api/favorites/:mentorId
// @desc    Rimuove un mentor dai preferiti
// @access  Privato (Mentee)
router.delete('/:mentorId', authMiddleware, menteeOnly, removeFavorite);

module.exports = router;