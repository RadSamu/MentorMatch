const pool = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendEmail = require('../utils/sendEmail');

exports.register = async (req, res) => {
  const { name, surname, email, password, role, gender } = req.body;

  // 1. Validazione di base dei dati ricevuti
  if (!name || !surname || !email || !password || !role || !gender) {
    return res.status(400).json({ msg: 'Per favore, inserisci tutti i campi.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ msg: 'La password deve contenere almeno 6 caratteri.' });
  }

  if (role !== 'mentor' && role !== 'mentee') {
    return res.status(400).json({ msg: 'Ruolo non valido. Deve essere "mentor" o "mentee".' });
  }

  try {
    // 2. Controlla se l'utente esiste già nel database
    const userExists = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      return res.status(400).json({ msg: 'Un utente con questa email esiste già.' });
    }

    // 3. Hash (criptazione) della password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Inserisci il nuovo utente nel database
    const newUser = await pool.query(
      'INSERT INTO users (name, surname, email, password_hash, role, gender) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, name, email, role',
      [name, surname, email, hashedPassword, role, gender]
    );

    // 5. Genera il Token JWT (Logica allineata con i test)
    const payload = {
      user: {
        id: newUser.rows[0].id,
        role: newUser.rows[0].role
      }
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        res.status(201).json({ token });
      }
    );
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

exports.login = async (req, res) => {
  const { email, password } = req.body;

  // 1. Validazione di base
  if (!email || !password) {
    return res.status(400).json({ msg: 'Per favore, inserisci email e password.' });
  }

  try {
    // 2. Cerca l'utente nel database tramite email
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Messaggio generico per sicurezza: non rivelare se l'email esiste o no
      // FIX: Esegui un confronto fittizio per prevenire Timing Attacks (Enumerazione Utenti)
      await bcrypt.compare(password, '$2a$10$abcdefghijklmnopqrstuvwxyzABC'); 
      return res.status(400).json({ msg: 'Credenziali non valide.' });
    }

    const user = userResult.rows[0];

    // 3. Confronta la password fornita con quella nel DB
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Credenziali non valide.' });
    }

    // 4. Se le credenziali sono corrette, crea e restituisci un token JWT
    const payload = {
      user: {
        id: user.id,
        role: user.role,
      },
    };

    jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: '1h' }, // Allineato a 1h come nei test
      (err, token) => {
        if (err) throw err;
        res.json({ token });
      }
    );
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del server');
  }
};

exports.getMe = async (req, res) => {
  try {
    // Grazie al middleware, abbiamo req.user.id
    // Selezioniamo i dati dell'utente dal DB senza la password
    const user = await pool.query(
      'SELECT id, name, surname, email, role, gender, avatar_url, sector, bio, languages, hourly_rate FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(user.rows[0]);
  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del Server');
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      // Non riveliamo che l'utente non esiste per sicurezza
      return res.status(200).json({ msg: 'Se un utente con questa email esiste, riceverà un link per il reset.' });
    }

    const user = userResult.rows[0];

    // 1. Genera un token di reset
    const resetToken = crypto.randomBytes(20).toString('hex');
    const resetPasswordToken = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // Scade tra 10 minuti

    // 2. Salva il token e la scadenza nel database
    await pool.query(
      'UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3',
      [resetPasswordToken, resetPasswordExpires, user.id]
    );

    // 3. Crea l'URL di reset e invia l'email
    const frontendUrl = process.env.FRONTEND_URL || process.env.RENDER_EXTERNAL_URL || 'http://localhost:3000';
    const resetUrl = `${frontendUrl}/reset-password.html?token=${resetToken}`;
    const message = `
      <h1>Hai richiesto un reset della password</h1>
      <p>Per favore, clicca su questo link per impostare una nuova password. Il link è valido per 10 minuti:</p>
      <a href="${resetUrl}" clicktracking=off>${resetUrl}</a>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Reset della Password - MentorMatch',
      message,
    });

    res.status(200).json({ msg: 'Email per il reset della password inviata.' });

  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    // In caso di errore, non salvare il token
    await pool.query('UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE email = $1', [email]);
    res.status(500).send('Errore del server');
  }
};

exports.resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  // 1. Cripta il token ricevuto per confrontarlo con quello nel DB
  const resetPasswordToken = crypto.createHash('sha256').update(token).digest('hex');

  try {
    // 2. Cerca l'utente con quel token e controlla che non sia scaduto
    const userResult = await pool.query(
      'SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > NOW()',
      [resetPasswordToken]
    );

    if (userResult.rows.length === 0) {
      return res.status(400).json({ msg: 'Token non valido o scaduto.' });
    }

    const user = userResult.rows[0];

    // 3. Cripta la nuova password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 4. Aggiorna la password nel database
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashedPassword, user.id]);

    // 5. Pulisci i campi del token di reset
    await pool.query('UPDATE users SET reset_password_token = NULL, reset_password_expires = NULL WHERE id = $1', [user.id]);

    res.status(200).json({ msg: 'Password aggiornata con successo.' });

  } catch (err) {
    if (process.env.NODE_ENV !== 'test') console.error(err.message);
    res.status(500).send('Errore del server');
  }
};