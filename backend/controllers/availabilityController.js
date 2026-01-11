const pool = require('../config/db');

exports.createAvailability = async (req, res) => {
    const { start_time, meeting_link, duration } = req.body;
    const mentor_id = req.user.id;

    // Semplice validazione
    if (!start_time) {
        return res.status(400).json({ msg: 'La data di inizio è richiesta.' });
    }
    
    const startTime = new Date(start_time);
    if (isNaN(startTime.getTime())) {
        return res.status(400).json({ msg: 'Formato data non valido.' });
    }

    if (startTime < new Date()) {
        return res.status(400).json({ msg: 'Non puoi creare disponibilità nel passato.' });
    }

    // Validazione URL Meeting (Sicurezza)
    if (meeting_link && !/^https?:\/\/.+/.test(meeting_link)) {
        return res.status(400).json({ msg: 'Il link del meeting deve essere un URL valido (http:// o https://).' });
    }

    // Gestione Durata (Default 60 minuti se non specificata)
    const durationMinutes = duration ? parseInt(duration) : 60;
    if (isNaN(durationMinutes) || durationMinutes < 15) {
        return res.status(400).json({ msg: 'La durata deve essere un numero valido (minimo 15 minuti).' });
    }

    try {
        // Calcoliamo l'ora di fine basata sulla durata
        const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

        // BUG FIX: Controlla se esiste già uno slot che si sovrappone
        const overlapCheck = await pool.query(
            `SELECT id FROM availabilities 
             WHERE mentor_id = $1 
             AND (start_ts, end_ts) OVERLAPS ($2, $3)`,
            [mentor_id, startTime, endTime]
        );

        if (overlapCheck.rows.length > 0) {
            return res.status(400).json({ msg: 'Hai già una disponibilità o una prenotazione in questo orario.' });
        }

        const newSlot = await pool.query(
            'INSERT INTO availabilities (mentor_id, start_ts, end_ts, meeting_link, slot_length_minutes) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [mentor_id, startTime, endTime, meeting_link, durationMinutes]
        );

        res.status(201).json(newSlot.rows[0]);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    }
};

exports.getMyAvailabilities = async (req, res) => {
    try {
        // Modifichiamo la query per ottenere TUTTI gli slot futuri, sia prenotati che non.
        const query = 'SELECT * FROM availabilities WHERE mentor_id = $1 AND start_ts > NOW() ORDER BY start_ts ASC';
        const slots = await pool.query(query, [req.user.id]);
        res.json(slots.rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    }
};

exports.deleteAvailability = async (req, res) => {
    try {
        // Aggiungiamo un controllo per assicurarci che lo slot non sia prenotato
        const result = await pool.query(
            'DELETE FROM availabilities WHERE id = $1 AND mentor_id = $2 AND is_booked = false', 
            [req.params.id, req.user.id]
        );
        if (result.rowCount === 0) {
            return res.status(400).json({ msg: 'Impossibile eliminare lo slot. Potrebbe essere già stato prenotato o non esistere.' });
        }
        res.json({ msg: 'Slot di disponibilità cancellato con successo.' });
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    }
};

exports.getMentorAvailabilities = async (req, res) => {
    try {
        const { mentorId } = req.params;
        const slots = await pool.query(
            "SELECT * FROM availabilities WHERE mentor_id = $1 AND start_ts > NOW() AND is_booked = false ORDER BY start_ts ASC",
            [mentorId]
        );
        res.json(slots.rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    }
};