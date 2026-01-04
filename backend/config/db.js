const { Pool } = require('pg');

// Crea un pool di connessioni
let config;

// Se c'è DATABASE_URL (Render), usa quello. Altrimenti usa i parametri singoli (Locale)
if (process.env.DATABASE_URL) {
  config = {
    connectionString: process.env.DATABASE_URL,
  };
} else {
  config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  };
}

// Se siamo in produzione o su Render, abilitiamo SSL
if (process.env.NODE_ENV === 'production' || process.env.RENDER) {
  config.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(config);

// Test della connessione
if (process.env.NODE_ENV !== 'test') {
  pool.connect((err, client, release) => {
    if (err) {
      return console.error('Errore di connessione al DB', err.stack);
    }
    console.log('Connesso a PostgreSQL con successo!');
    release();
  });
}

module.exports = pool;
