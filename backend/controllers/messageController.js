const pool = require('../config/db');

// @desc    Ottenere la lista delle conversazioni (utenti unici con cui si è scambiato messaggi)
// @route   GET /api/messages/conversations
// @access  Privato
exports.getConversations = async (req, res) => {
    const userId = req.user.id;
    try {
        // Query complessa per ottenere l'ultimo messaggio di ogni conversazione
        const result = await pool.query(`
            WITH last_messages AS (
                SELECT
                    DISTINCT ON (conversation_partner)
                    CASE WHEN from_user = $1 THEN to_user ELSE from_user END AS conversation_partner,
                    id,
                    body,
                    created_at,
                    is_read,
                    from_user
                FROM messages
                WHERE from_user = $1 OR to_user = $1
                ORDER BY conversation_partner, created_at DESC
            )
            SELECT
                u.id,
                u.name,
                u.surname,
                u.avatar_url,
                lm.body AS last_message,
                lm.created_at AS last_message_date,
                (lm.from_user != $1 AND NOT lm.is_read) AS has_unread
            FROM last_messages lm
            JOIN users u ON u.id = lm.conversation_partner
            ORDER BY lm.created_at DESC;
        `, [userId]);
        res.json(result.rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    }
};

// @desc    Ottenere i messaggi con un utente specifico
// @route   GET /api/messages/:otherUserId
// @access  Privato
exports.getMessagesWithUser = async (req, res) => {
    const userId = req.user.id;
    const otherUserId = req.params.otherUserId;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        // Segna i messaggi come letti
        await client.query(
            'UPDATE messages SET is_read = true WHERE from_user = $1 AND to_user = $2',
            [otherUserId, userId]
        );
        // Recupera i messaggi
        const result = await client.query(
            `SELECT m.id, m.from_user, m.to_user, m.body, m.created_at, u.name as from_user_name, u.avatar_url as from_user_avatar
             FROM messages m
             JOIN users u ON m.from_user = u.id
             WHERE (from_user = $1 AND to_user = $2) OR (from_user = $2 AND to_user = $1)
             ORDER BY m.created_at ASC`,
            [userId, otherUserId]
        );
        await client.query('COMMIT');
        res.json(result.rows);
    } catch (err) {
        await client.query('ROLLBACK');
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    } finally {
        client.release();
    }
};

// @desc    Inviare un messaggio a un utente
// @route   POST /api/messages/:receiverId
// @access  Privato
exports.sendMessage = async (req, res) => {
    const senderId = req.user.id;
    const receiverId = req.params.receiverId;
    const { body } = req.body;

    if (process.env.NODE_ENV !== 'test') {
        console.log(`[DEBUG] Ricevuta richiesta di invio messaggio da ${senderId} a ${receiverId}`);
    }

    if (!body) {
        return res.status(400).json({ msg: 'Il corpo del messaggio non può essere vuoto.' });
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const newMessage = await client.query(
            'INSERT INTO messages (from_user, to_user, body) VALUES ($1, $2, $3) RETURNING *',
            [senderId, receiverId, body]
        );

        // Crea una notifica per il destinatario
        const sender = await client.query('SELECT name FROM users WHERE id = $1', [senderId]);
        const notificationType = 'new_message';
        const notificationPayload = {
            fromUserName: sender.rows[0].name,
            fromUserId: senderId
        };
        await client.query('INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)', [receiverId, notificationType, notificationPayload]);

        await client.query('COMMIT');
        res.status(201).json(newMessage.rows[0]);
    } catch (err) {
        await client.query('ROLLBACK');
        if (process.env.NODE_ENV !== 'test') console.error(err.message);
        res.status(500).send('Errore del Server');
    } finally {
        client.release();
    }
};