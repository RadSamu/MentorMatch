const pool = require('../config/db');

// @desc    Ottiene le notifiche per l'utente loggato
// @route   GET /api/notifications
// @access  Privato
exports.getNotifications = async (req, res) => {
    try {
        const notifications = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json(notifications.rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

// @desc    Segna una notifica come letta
// @route   PUT /api/notifications/:id/read
// @access  Privato
exports.markAsRead = async (req, res) => {
    try {
        const result = await pool.query(
            'UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2 RETURNING *',
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) {
            return res.status(404).json({ msg: 'Notifica non trovata o non autorizzato.' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

// @desc    Segna tutte le notifiche come lette
// @route   PUT /api/notifications/read-all
// @access  Privato
exports.markAllAsRead = async (req, res) => {
    try {
        await pool.query('UPDATE notifications SET is_read = true WHERE user_id = $1', [req.user.id]);
        res.json({ msg: 'Tutte le notifiche sono state segnate come lette.' });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};