const { Pool } = require('pg');

// Crea un pool di connessioni
let config;

if (process.env.DATABASE_URL) {
  // Configurazione per Render (Produzione)
  config = {
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false } // Necessario per le connessioni sicure su Render
  };
} else {
  // Configurazione per Localhost (Sviluppo)
  config = {
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
  };
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
