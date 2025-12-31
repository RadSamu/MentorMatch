const pool = require('../config/db');

exports.getFavoriteIds = async (req, res) => {
    try {
        const result = await pool.query('SELECT mentor_id FROM favorites WHERE mentee_id = $1', [req.user.id]);
        res.json(result.rows.map(row => row.mentor_id));
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

exports.getFavorites = async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT mp.id, mp.name, mp.surname, mp.sector, mp.avatar_url 
             FROM mentor_profiles mp
             JOIN favorites f ON mp.id = f.mentor_id
             WHERE f.mentee_id = $1`,
            [req.user.id]
        );
        res.json(result.rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

exports.addFavorite = async (req, res) => {
    try {
        await pool.query('INSERT INTO favorites (mentee_id, mentor_id) VALUES ($1, $2)', [req.user.id, req.params.mentorId]);
        res.status(201).json({ msg: 'Mentor aggiunto ai preferiti.' });
    } catch (err) {
        if (err.code === '23505') return res.status(400).json({ msg: 'Questo mentor è già nei tuoi preferiti.' });
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

exports.removeFavorite = async (req, res) => {
    try {
        await pool.query('DELETE FROM favorites WHERE mentee_id = $1 AND mentor_id = $2', [req.user.id, req.params.mentorId]);
        res.json({ msg: 'Mentor rimosso dai preferiti.' });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};