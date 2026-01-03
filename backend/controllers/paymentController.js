const pool = require('../config/db');

exports.mockPayment = async (req, res) => {
    const { bookingId } = req.body;
    const menteeId = req.user.id;

    if (!bookingId) {
        return res.status(400).json({ msg: 'ID della prenotazione mancante.' });
    }

    try {
        // Controlla che la prenotazione esista, sia 'pending' e appartenga al mentee
        const bookingRes = await pool.query(
            'SELECT * FROM bookings WHERE id = $1 AND mentee_id = $2',
            [bookingId, menteeId]
        );

        if (bookingRes.rows.length === 0) {
            return res.status(404).json({ msg: 'Prenotazione non trovata o non autorizzata.' });
        }

        const booking = bookingRes.rows[0];
        if (booking.status !== 'pending') {
            return res.status(400).json({ msg: `La prenotazione è già nello stato: ${booking.status}.` });
        }

        // Simula un ritardo di 2 secondi per il processo di pagamento
        setTimeout(async () => {
            try {
                // Aggiorna lo stato della prenotazione a 'confirmed'
                // FIX: Controlla che lo stato sia ancora 'pending' per evitare di confermare prenotazioni cancellate nel frattempo
                const result = await pool.query(
                    "UPDATE bookings SET status = 'confirmed', updated_at = now() WHERE id = $1 AND status = 'pending'",
                    [bookingId]
                );
                if (result.rowCount === 0) {
                    return; // La prenotazione non è più pending (es. cancellata), non fare nulla
                }
                res.status(200).json({ status: 'success', msg: 'Pagamento completato. Prenotazione confermata.' });
            } catch (err) {
                if (process.env.NODE_ENV !== 'test') console.error('Errore durante l\'aggiornamento del pagamento:', err.message);
                // In uno scenario reale, qui dovremmo gestire l'errore in modo più robusto
                if (!res.headersSent) res.status(500).send('Errore del server durante la conferma.');
            }
        }, 2000);

    } catch (err) {
        if (process.env.NODE_ENV !== 'test') console.error('Errore nel mock payment:', err.message);
        res.status(500).send('Errore del server');
    }
};