const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Script per inizializzare il database remoto (Render) dal computer locale

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  console.error('Errore: Variabile DATABASE_URL mancante.');
  console.error('Uso: DATABASE_URL="tua_stringa_di_connessione_render" node init-db.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }, // Obbligatorio per connettersi a Render dall'esterno
});

const schemaPath = path.join(__dirname, '../database/schema.sql');

async function initDb() {
  try {
    console.log(`Lettura schema da: ${schemaPath}`);
    const sql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Connessione al database remoto...');
    await pool.query(sql);

    console.log('✅ Database inizializzato con successo! Tabelle create.');
  } catch (err) {
    console.error('❌ Errore durante l\'inizializzazione:', err);
  } finally {
    await pool.end();
  }
}

initDb();