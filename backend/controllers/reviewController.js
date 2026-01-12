const pool = require('../config/db');

/**
 * @desc    Un mentee lascia una recensione per un mentor
 * @route   POST /api/reviews
 * @access  Privato (solo Mentee)
 */
exports.createReview = async (req, res) => {
  const menteeId = req.user.id;
  const { booking_id, rating, comment } = req.body;

  if (!booking_id || !rating) {
    return res.status(400).json({ msg: 'Per favore, fornisci ID prenotazione e valutazione.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ msg: 'La valutazione deve essere compresa tra 1 e 5.' });
  }

  try {
    // 1. Verifica che la prenotazione esista, appartenga al mentee e sia conclusa
    const bookingResult = await pool.query(
      `SELECT b.mentor_id, a.start_ts, a.end_ts
       FROM bookings b
       JOIN availabilities a ON b.slot_id = a.id
       WHERE b.id = $1 AND b.mentee_id = $2 AND b.status = 'confirmed'`,
      [booking_id, menteeId]
    );

    if (bookingResult.rows.length === 0) {
      return res.status(404).json({ msg: 'Prenotazione non trovata o non autorizzata.' });
    }

    // Opzionale: Controlla se la sessione è già avvenuta (controlla start_ts o end_ts se presente)
    const slot = bookingResult.rows[0];
    const startTs = slot.start_ts ? new Date(slot.start_ts) : null;
    const endTs = slot.end_ts ? new Date(slot.end_ts) : null;

    if ((startTs && startTs > new Date()) || (endTs && endTs > new Date())) {
      return res.status(400).json({ msg: 'La sessione non ancora avvenuta.' });
    }

    const mentorId = bookingResult.rows[0].mentor_id;

    // 2. Inserisci la recensione (il trigger del DB aggiornerà il rating del mentor)
    const newReview = await pool.query(
      'INSERT INTO reviews (booking_id, mentee_id, mentor_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [booking_id, menteeId, mentorId, rating, comment]
    );

    res.status(201).json(newReview.rows[0]);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(err.message);
    }
    // Gestisce l'errore di recensione duplicata dal vincolo UNIQUE del DB
    if (err.code === '23505') {
      return res.status(400).json({ msg: 'Hai già lasciato una recensione per questa sessione.' });
    }
    res.status(500).send('Errore del Server');
  }
};

/**
 * @desc    Ottiene tutte le recensioni per un mentor specifico
 * @route   GET /api/reviews/mentor/:mentorId
 * @access  Pubblico
 */
exports.getMentorReviews = async (req, res) => {
  try {
    const { mentorId } = req.params;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 5; // Mostriamo 5 recensioni per pagina
    const offset = (page - 1) * limit;

    // Query per contare il totale delle recensioni
    const totalResult = await pool.query(
      'SELECT COUNT(*) FROM reviews WHERE mentor_id = $1',
      [mentorId]
    );
    const totalReviews = parseInt(totalResult.rows[0].count, 10);
    const totalPages = Math.ceil(totalReviews / limit);

    // Query per ottenere le recensioni per la pagina corrente
    const reviewsResult = await pool.query(
      `SELECT r.id, r.rating, r.comment, r.created_at, u.name as mentee_name 
       FROM reviews r 
       JOIN users u ON r.mentee_id = u.id 
       WHERE r.mentor_id = $1 
       ORDER BY r.created_at DESC
       LIMIT $2 OFFSET $3`,
      [mentorId, limit, offset]
    );

    res.json({
      data: reviewsResult.rows,
      pagination: { currentPage: page, totalPages, totalReviews }
    });
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') {
      console.error(err.message);
    }
    res.status(500).send('Errore del Server');
  }
};