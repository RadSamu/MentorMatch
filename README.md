# 🎓 MentorMatch

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Node Version](https://img.shields.io/badge/node-v18%2B-blue)
![License](https://img.shields.io/badge/license-MIT-green)

**MentorMatch** è una piattaforma web che connette professionisti esperti (**Mentor**) con persone desiderose di imparare (**Mentee**). Permette di gestire disponibilità, prenotare sessioni di mentoring 1:1, lasciare recensioni e gestire il proprio percorso di crescita professionale.

## 🚀 Funzionalità Principali

### Per i Mentee
*   **Ricerca Avanzata:** Filtra mentor per settore, lingua, prezzo e valutazione.
*   **Prenotazione Semplice:** Visualizza il calendario del mentor e prenota uno slot disponibile.
*   **Dashboard:** Gestisci le tue prenotazioni future e passate.
*   **Recensioni:** Lascia feedback e valutazioni dopo le sessioni completate.
*   **Preferiti:** Salva i mentor che ti interessano per dopo.

### Per i Mentor
*   **Gestione Disponibilità:** Calendario interattivo per definire gli orari delle sessioni.
*   **Profilo Professionale:** Personalizza bio, competenze, tariffe e avatar.
*   **Statistiche:** Monitora le prossime sessioni e la tua valutazione media.
*   **Notifiche:** Ricevi avvisi per nuove prenotazioni o cancellazioni.

## 🛠️ Tech Stack

*   **Frontend:** HTML5, CSS3, Bootstrap 5, jQuery.
*   **Backend:** Node.js, Express.js.
*   **Database:** PostgreSQL (Relazionale).
*   **Sicurezza:** JWT (JSON Web Tokens), Bcrypt (Hashing password), Helmet.
*   **DevOps:** Docker, Render (Cloud PaaS), CI/CD.
*   **Testing:** Jest, Supertest.

## 📚 Documentazione Tecnica

Per dettagli approfonditi su API, Schema Database e Architettura, consulta il file dedicato:

👉 **[DOCUMENTATION.md](./DOCUMENTATION.md)**

## Struttura del Progetto

```
MentorMatch/
├── backend/            # Codice sorgente del server (API)
│   ├── config/         # Configurazione DB
│   ├── controllers/    # Logica di business
│   ├── routes/         # Definizione endpoint API
│   ├── tests/          # Test automatici (Jest)
│   └── server.js       # Entry point
├── database/           # Script SQL
│   └── schema.sql      # Definizione tabelle e trigger
├── frontend/           # Interfaccia utente (Static files)
│   ├── css/
│   ├── js/
│   └── *.html
├── docker-compose.yml  # Orchestrazione container locale
├── Dockerfile          # Definizione immagine Docker
└── render.yaml         # Infrastructure as Code per Render
```

## ⚡ Setup Locale (Sviluppo)

### Prerequisiti
*   Node.js (v18+)
*   PostgreSQL (locale o via Docker)
*   Git

### 1. Clona il repository
```bash
git clone https://github.com/tuo-username/mentormatch.git
cd mentormatch
```

### 2. Configura il Backend
Crea un file `.env` nella cartella `backend/`:
```env
PORT=3000
NODE_ENV=development
JWT_SECRET=chiave_segreta_super_sicura
# Configurazione DB Locale
DB_USER=postgres
DB_PASSWORD=tua_password
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=mentormatch
```

### 3. Inizializza il Database
Esegui lo script SQL `database/schema.sql` nel tuo database PostgreSQL locale per creare le tabelle.

### 4. Avvia il Server
```bash
cd backend
npm install
npm start
```
Il server sarà attivo su `http://localhost:3000`.

### 5. Avvia il Frontend
Poiché il backend serve anche i file statici, basta visitare `http://localhost:3000` nel browser.

### 🔐 Credenziali Demo (Opzionale)
Per testare rapidamente la piattaforma, puoi creare questi utenti (o usarli se hai popolato il DB con dati di seed):

| Ruolo | Email | Password |
|-------|-------|----------|
| **Mentee** | `mentee@example.com` | `password123` |
| **Mentor** | `mentor@example.com` | `password123` |

---

## 🐳 Setup con Docker (Consigliato)

Se hai Docker installato, puoi avviare l'intero stack con un solo comando:

```bash
docker-compose up --build
```
L'app sarà disponibile su `http://localhost:3000` e il database su `localhost:5435`.

---

## 🧪 Testing

Il progetto include una suite di test automatici per le funzionalità critiche (Auth, Booking, API).

```bash
cd backend
npm test
```

## ☁️ Deploy su Cloud (Render)

Il progetto è configurato per il deploy automatico su **Render.com**.

1.  Collega il repository GitHub a Render.
2.  Crea un nuovo **Blueprint** usando il file `render.yaml`.
3.  Render creerà automaticamente:
    *   Un database PostgreSQL gestito.
    *   Un Web Service per l'applicazione Node.js.
4.  Le variabili d'ambiente (come `DATABASE_URL`) verranno configurate automaticamente.

## 📄 Licenza
Distribuito sotto licenza MIT.