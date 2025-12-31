const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const authMiddleware = require('../middleware/authMiddleware');
const { getMe, updateUserProfile, uploadAvatar } = require('../controllers/userController');

// --- Configurazione di Multer per l'upload dell'avatar ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/'); // Salva i file nella cartella 'uploads'
    },
    filename: function (req, file, cb) {
        // Crea un nome file unico per evitare sovrascritture: user-ID-timestamp.ext
        const uniqueSuffix = `user-${req.user.id}-${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// --- Definizione delle Rotte ---

// @route   GET /api/users/me
// @desc    Ottieni i dati completi del profilo utente
router.get('/me', authMiddleware, getMe);

// @route   PUT /api/users/profile
// @desc    Aggiorna il profilo di un mentor
router.put('/profile', authMiddleware, updateUserProfile);

// @route   POST /api/users/avatar
// @desc    Carica un avatar per l'utente loggato
router.post('/avatar', authMiddleware, upload.single('avatar'), uploadAvatar);

module.exports = router;