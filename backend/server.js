require('dotenv').config(); // Carica le variabili dal file .env

// DEBUG: Verifica configurazione SMTP all'avvio
console.log('--- DEBUG SMTP ---');
console.log('SMTP_HOST:', process.env.SMTP_HOST || 'MANCANTE');
console.log('SMTP_EMAIL:', process.env.SMTP_EMAIL || 'MANCANTE');
console.log('SMTP_PASSWORD:', process.env.SMTP_PASSWORD ? 'PRESENTE' : 'MANCANTE');
console.log('------------------');

const express = require('express');
const path = require('path');
const app = express();
const cors = require('cors');
const helmet = require('helmet');
const port = process.env.PORT || 3000;

// Importa le rotte
const authRoutes = require('./routes/auth');
const mentorRoutes = require('./routes/mentorRoutes');
const availabilityRoutes = require('./routes/availabilityRoutes');
const bookingRoutes = require('./routes/bookingRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes'); // Importa le rotte delle notifiche
const dashboardRoutes = require('./routes/dashboardRoutes'); // Importa rotte dashboard
const favoriteRoutes = require('./routes/favoriteRoutes'); // Importa rotte preferiti
const messageRoutes = require('./routes/messageRoutes'); // Importa rotte messaggi
const paymentRoutes = require('./routes/paymentRoutes'); // Importa rotte pagamenti

// Middleware to parse JSON requests
app.use(cors()); // Abilita CORS per tutte le rotte

// Sicurezza: Helmet imposta vari header HTTP per proteggere l'app
// Configuriamo la Content Security Policy per permettere i CDN esterni (Bootstrap, jQuery, FontAwesome)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://code.jquery.com", "https://kit.fontawesome.com", "https://cdnjs.cloudflare.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://fonts.googleapis.com", "https://ka-f.fontawesome.com", "https://cdnjs.cloudflare.com"],
      fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://ka-f.fontawesome.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://ka-f.fontawesome.com"], // Necessario per le icone FontAwesome
    },
  },
}));

app.use(express.json());

// Rendi la cartella 'uploads' accessibile pubblicamente
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Usa le rotte per l'autenticazione
// Tutte le rotte in auth.js avranno il prefisso /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/mentors', mentorRoutes);
app.use('/api/availability', availabilityRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes); // <-- ASSICURATI CHE QUESTA RIGA SIA PRESENTE
app.use('/api/dashboard', dashboardRoutes); // Usa rotte dashboard
app.use('/api/favorites', favoriteRoutes); // Usa rotte preferiti
app.use('/api/messages', messageRoutes); // Usa rotte messaggi
app.use('/api/payments', paymentRoutes); // Usa rotte pagamenti

// --- MONITORAGGIO: Health Check Endpoint ---
app.get('/api/health', (req, res) => {
    res.status(200).json({ status: 'UP', timestamp: new Date().toISOString() });
});

// Serve i file statici del frontend
// Nota: Nel container Docker, il frontend è copiato in '../frontend' rispetto al backend
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotta "catch-all": per qualsiasi richiesta che non è un'API, restituisci l'index.html
app.get(/.*/, (req, res) => {
    if (!req.path.startsWith('/api')) {
        res.sendFile(path.join(__dirname, '../frontend/index.html'));
    } else {
        res.status(404).json({ msg: 'API route not found' });
    }
});

// Middleware globale per la gestione degli errori (es. errori di Multer)
app.use((err, req, res, next) => {
    if (err.message === 'Formato file non supportato. Carica solo immagini (JPEG, PNG, WEBP).') {
        return res.status(400).json({ msg: err.message });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ msg: 'Il file è troppo grande. Dimensione massima 2MB.' });
    }
    console.error(err.stack);
    res.status(500).json({ msg: 'Si è verificato un errore interno del server.' });
});

// Start the server
if (require.main === module) {
  app.listen(port, () => {
    console.log(`Server in ascolto su http://localhost:${port}`); 
  });
}

module.exports = app;