const pool = require('../config/db');
const sendEmail = require('../utils/sendEmail');

exports.createBooking = async (req, res) => {
    const { availability_id } = req.body;
    const mentee_id = req.user.id;

    if (!availability_id) {
        return res.status(400).json({ msg: 'ID dello slot di disponibilità non fornito.' });
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Controlla il ruolo dell'utente che prenota
        const userQuery = await client.query('SELECT role FROM users WHERE id = $1', [mentee_id]);
        if (userQuery.rows[0].role !== 'mentee') {
            await client.query('ROLLBACK');
            return res.status(403).json({ msg: 'Solo i mentee possono prenotare una sessione.' });
        }

        // 2. Seleziona lo slot e lo blocca per evitare race conditions
        const slotQuery = await client.query(
            'SELECT id, mentor_id, start_ts, is_booked, meeting_link FROM availabilities WHERE id = $1 FOR UPDATE', 
            [availability_id]
        );
        const slot = slotQuery.rows[0];

        // 3. Controlli di validità sullo slot
        if (!slot) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Slot di disponibilità non trovato.' });
        }
        if (slot.is_booked) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Questo slot è già stato prenotato.' });
        }
        if (slot.mentor_id === mentee_id) {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Non puoi prenotare una sessione con te stesso.' });
        }

        // 4. Aggiorna lo slot per marcarlo come prenotato
        await client.query('UPDATE availabilities SET is_booked = true WHERE id = $1', [availability_id]);

        // 4b. Recupera la tariffa oraria del mentor per stabilire prezzo e stato iniziale
        const mentorRes = await client.query('SELECT hourly_rate FROM users WHERE id = $1', [slot.mentor_id]);
        const price = parseFloat(mentorRes.rows[0].hourly_rate || 0);
        const initialStatus = price > 0 ? 'pending' : 'confirmed';
        
        // Usa il link fornito dal mentor, altrimenti generane uno simulato
        const finalMeetingLink = slot.meeting_link || `https://meet.google.com/mock-${Math.random().toString(36).substring(7)}`;

        // 5. Crea una nuova prenotazione (FIX: Non riciclare mai prenotazioni cancellate per mantenere lo storico)
        const result = await client.query(
            "INSERT INTO bookings (slot_id, mentor_id, mentee_id, status, price, meeting_link) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *",
            [availability_id, slot.mentor_id, mentee_id, initialStatus, price, finalMeetingLink]
        );
        const newBooking = result.rows[0];

        // 6. Crea una notifica per il MENTOR usando type e payload
        const menteeUser = await client.query('SELECT name, surname FROM users WHERE id = $1', [mentee_id]);
        const menteeFullName = `${menteeUser.rows[0].name} ${menteeUser.rows[0].surname}`;
        const notificationType = 'booking_confirmed';
        const notificationPayload = {
            menteeName: menteeFullName,
            bookingId: newBooking.id
        };
        await client.query('INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)', [slot.mentor_id, notificationType, notificationPayload]);

        // 7. Invia una notifica email al MENTOR
        try {
            const mentorUser = await client.query('SELECT email, name FROM users WHERE id = $1', [slot.mentor_id]);
            if (mentorUser.rows.length > 0) {
                const mentorEmail = mentorUser.rows[0].email;
                const mentorName = mentorUser.rows[0].name;
                const bookingDate = new Date(slot.start_ts).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });

                const message = `
                    <h1>Nuova Prenotazione Ricevuta!</h1>
                    <p>Ciao ${mentorName},</p>
                    <p>Hai ricevuto una nuova prenotazione da <strong>${menteeFullName}</strong> per il giorno <strong>${bookingDate}</strong>.</p>
                    <p>Puoi visualizzare i dettagli nella tua dashboard su MentorMatch.</p>
                `;
                await sendEmail({ email: mentorEmail, subject: 'Nuova Prenotazione su MentorMatch', message });
            }
        } catch (emailErr) {
            if (process.env.NODE_ENV !== 'test') {
                console.error("Errore nell'invio dell'email di conferma prenotazione:", emailErr.message);
            }
        }

        await client.query('COMMIT');
        res.status(201).json(newBooking);

    } catch (err) {
        await client.query('ROLLBACK');
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    } finally {
        client.release();
    }
};

exports.getMyBookings = async (req, res) => {
    const userId = req.user.id;

    try {
        // Questa query recupera tutte le prenotazioni per l'utente loggato,
        // sia che sia un mentee o un mentor.
        const query = `
            SELECT 
                b.id, 
                b.status,
                b.price,
                b.mentor_id,
                b.mentee_id,
                a.start_ts,
                a.end_ts,
                b.meeting_link,
                mentor.name as mentor_name,
                mentor.surname as mentor_surname,
                mentor.avatar_url as mentor_avatar,
                mentee.name as mentee_name,
                mentee.surname as mentee_surname,
                mentee.avatar_url as mentee_avatar,
                CASE WHEN r.id IS NOT NULL THEN true ELSE false END as has_review
            FROM bookings b
            JOIN availabilities a ON b.slot_id = a.id
            JOIN users mentor ON b.mentor_id = mentor.id
            JOIN users mentee ON b.mentee_id = mentee.id
            LEFT JOIN reviews r ON r.booking_id = b.id
            WHERE (b.mentee_id = $1 OR b.mentor_id = $1)
            ORDER BY a.start_ts DESC
        `;
        const { rows } = await pool.query(query, [userId]);
        res.json(rows);
    } catch (err) {
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    }
};

exports.cancelBooking = async (req, res) => {
    const bookingId = req.params.id;
    const userId = req.user.id;

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // 1. Recupera la prenotazione e lo slot associato
        const bookingQuery = await client.query(
            `SELECT b.id, b.mentor_id, b.mentee_id, b.slot_id, b.status, a.is_booked, a.start_ts
             FROM bookings b
             JOIN availabilities a ON b.slot_id = a.id
             WHERE b.id = $1 FOR UPDATE`, // Blocca la riga per la modifica
            [bookingId]
        );
        const booking = bookingQuery.rows[0];

        // 2. Controlla se la prenotazione esiste
        if (!booking) {
            await client.query('ROLLBACK');
            return res.status(404).json({ msg: 'Prenotazione non trovata.' });
        }

        // 3. Controlla l'autorizzazione: solo il mentee o il mentor possono cancellare
        if (booking.mentee_id !== userId && booking.mentor_id !== userId) {
            await client.query('ROLLBACK');
            return res.status(403).json({ msg: 'Non autorizzato a cancellare questa prenotazione.' });
        }

        // 4. Controlla se la prenotazione è già stata cancellata o completata
        if (booking.status === 'canceled' || booking.status === 'done') {
            await client.query('ROLLBACK');
            return res.status(400).json({ msg: 'Questa prenotazione non può essere cancellata.' });
        }

        // 5. Aggiorna lo stato della prenotazione a "canceled"
        const updatedBooking = await client.query(
            "UPDATE bookings SET status = 'canceled' WHERE id = $1 RETURNING *",
            [bookingId]
        );

        // 6. Rendi nuovamente disponibile lo slot
        await client.query('UPDATE availabilities SET is_booked = false WHERE id = $1', [booking.slot_id]);

        // 7. Invia una notifica all'altro utente usando type e payload
        const cancelingUser = await client.query('SELECT name, surname FROM users WHERE id = $1', [userId]);
        const cancelingUserFullName = `${cancelingUser.rows[0].name} ${cancelingUser.rows[0].surname}`;
        
        let targetUserId, notificationType, notificationPayload;
        if (userId === booking.mentor_id) { // Se il mentor cancella
            targetUserId = booking.mentee_id;
            notificationType = 'booking_canceled_by_mentor';
            notificationPayload = { mentorName: cancelingUserFullName, bookingId: booking.id };
        } else { // Se il mentee cancella
            targetUserId = booking.mentor_id;
            notificationType = 'booking_canceled_by_mentee';
            notificationPayload = { menteeName: cancelingUserFullName, bookingId: booking.id };
        }
        await client.query('INSERT INTO notifications (user_id, type, payload) VALUES ($1, $2, $3)', [targetUserId, notificationType, notificationPayload]);

        // 8. Invia una notifica email all'altro utente
        try {
            const targetUser = await client.query('SELECT email, name FROM users WHERE id = $1', [targetUserId]);
            if (targetUser.rows.length > 0) {
                const targetEmail = targetUser.rows[0].email;
                const targetName = targetUser.rows[0].name;
                const bookingDate = new Date(booking.start_ts).toLocaleString('it-IT', { dateStyle: 'full', timeStyle: 'short' });

                const message = `
                    <h1>Sessione Cancellata</h1>
                    <p>Ciao ${targetName},</p>
                    <p>La tua sessione con <strong>${cancelingUserFullName}</strong> prevista per il <strong>${bookingDate}</strong> è stata cancellata.</p>
                    <p>Lo slot è ora nuovamente disponibile per la prenotazione. Controlla la tua dashboard per maggiori dettagli.</p>
                `;

                await sendEmail({ email: targetEmail, subject: 'Cancellazione Sessione su MentorMatch', message });
            }
        } catch (emailErr) {
            if (process.env.NODE_ENV !== 'test') {
                console.error("Errore nell'invio dell'email di cancellazione:", emailErr.message);
            }
            // Non blocchiamo la transazione se l'email fallisce
        }

        await client.query('COMMIT');
        res.json({ msg: 'Prenotazione cancellata con successo.', booking: updatedBooking.rows[0] });

    } catch (err) {
        await client.query('ROLLBACK');
        if (process.env.NODE_ENV !== 'test') {
            console.error(err.message);
        }
        res.status(500).send('Errore del Server');
    } finally {
        client.release();
    }
};