const pool = require('../config/db');

// @desc    Ottieni i dati completi del profilo utente
// @route   GET /api/users/me
// @access  Privato
exports.getMe = async (req, res) => {
    try {
        const user = await pool.query(
            'SELECT id, name, surname, email, role, bio, sector, languages, hourly_rate, avatar_url FROM users WHERE id = $1', 
            [req.user.id]
        );
        res.json(user.rows[0]);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

// @desc    Aggiorna il profilo testuale di un mentor (bio, headline)
// @route   PUT /api/users/profile
// @access  Privato (Mentor)
exports.updateUserProfile = async (req, res) => {
    const { headline, bio, languages, hourly_rate } = req.body;
    const userId = req.user.id;

    try {
        const updatedUser = await pool.query(
            'UPDATE users SET sector = $1, bio = $2, languages = $3, hourly_rate = $4 WHERE id = $5 RETURNING *',
            [headline, bio, languages, hourly_rate, userId]
        );

        res.json(updatedUser.rows[0]);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

// @desc    Carica o aggiorna l'avatar di un utente
// @route   POST /api/users/avatar
// @access  Privato
exports.uploadAvatar = async (req, res) => {
    if (!req.file) return res.status(400).json({ msg: 'Nessun file caricato' });
    try {
        const avatarUrl = `/uploads/${req.file.filename}`;
        const updatedUser = await pool.query(
            'UPDATE users SET avatar_url = $1 WHERE id = $2 RETURNING avatar_url', 
            [avatarUrl, req.user.id]
        );
        res.json(updatedUser.rows[0]);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};