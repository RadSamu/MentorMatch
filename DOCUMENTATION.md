# 📚 Documentazione Tecnica MentorMatch

Questa documentazione copre i dettagli architetturali, lo schema del database e le specifiche API del progetto.

## 1. Schema ER (Entity-Relationship)

Il database è relazionale (PostgreSQL). Di seguito il diagramma delle relazioni tra le entità principali.

```mermaid
erDiagram
    USERS ||--o{ AVAILABILITIES : "creates (mentor)"
    USERS ||--o{ BOOKINGS : "receives (mentor)"
    USERS ||--o{ BOOKINGS : "makes (mentee)"
    USERS ||--o{ REVIEWS : "writes (mentee)"
    USERS ||--o{ REVIEWS : "receives (mentor)"
    USERS ||--o{ NOTIFICATIONS : "receives"
    
    AVAILABILITIES ||--o| BOOKINGS : "has one"
    BOOKINGS ||--o| REVIEWS : "has one"

    USERS {
        int id PK
        string role "mentor/mentee"
        string email
        string password_hash
        string name
        string sector
        float hourly_rate
        float rating_avg
    }

    AVAILABILITIES {
        int id PK
        int mentor_id FK
        timestamp start_ts
        timestamp end_ts
        boolean is_booked
    }

    BOOKINGS {
        int id PK
        int slot_id FK
        int mentor_id FK
        int mentee_id FK
        string status "pending/confirmed/canceled"
        float price
    }

    REVIEWS {
        int id PK
        int booking_id FK
        int rating
        string comment
    }
```

## 2. API Reference (Endpoints Principali)

Tutte le risposte sono in formato JSON. L'autenticazione avviene tramite Header `Authorization: Bearer <token>`.

### 🔐 Autenticazione (`/api/auth`)
*   `POST /register`: Registra un nuovo utente (Mentor o Mentee).
*   `POST /login`: Autentica l'utente e restituisce il JWT.
*   `GET /me`: Restituisce il profilo dell'utente loggato.

### 👥 Utenti & Mentor (`/api/users`, `/api/mentors`)
*   `GET /api/mentors`: Lista mentor con filtri (settore, prezzo, rating).
*   `GET /api/mentors/:id`: Dettaglio pubblico di un mentor.
*   `PUT /api/users/profile`: Aggiorna bio, headline e tariffe (solo Mentor).
*   `POST /api/users/avatar`: Upload immagine profilo (Multipart/Form-Data).

### 📅 Disponibilità (`/api/availability`)
*   `GET /me`: Lista slot creati dal mentor loggato.
*   `GET /mentor/:id`: Lista slot disponibili per un dato mentor (pubblico).
*   `POST /`: Crea un nuovo slot orario.
*   `DELETE /:id`: Rimuove uno slot (se non prenotato).

### 🔖 Prenotazioni (`/api/bookings`)
*   `GET /me`: Storico prenotazioni (sia come mentor che come mentee).
*   `POST /`: Crea una prenotazione (blocca lo slot in transazione).
*   `PUT /:id/cancel`: Cancella una prenotazione e libera lo slot.

### ⭐ Recensioni (`/api/reviews`)
*   `POST /`: Inserisce una recensione (solo per sessioni `confirmed` e passate).
*   `GET /mentor/:id`: Ottiene le recensioni di un mentor paginater.

## 3. Guida al Deploy (Cloud)

L'infrastruttura è definita come codice (**IaC**) nel file `render.yaml`.

### Pipeline CI/CD su Render.com
1.  **Trigger:** Ogni `git push` sul branch `main` avvia la pipeline.
2.  **Build:** Render costruisce l'immagine Docker usando il `Dockerfile` nella root.
3.  **Deploy:**
    *   Il servizio web viene aggiornato (Zero Downtime Deploy).
    *   Le variabili d'ambiente (`DATABASE_URL`, `JWT_SECRET`) sono iniettate automaticamente.
4.  **Health Check:** Render interroga `/api/health`. Se risponde `200 OK`, il deploy è confermato.

### Gestione Database
Il database è un'istanza PostgreSQL gestita su Render (Regione: Oregon).
*   **Inizializzazione:** Eseguita manualmente via script locale `npm run init-db` (per sicurezza).
*   **Backup:** Gestiti automaticamente da Render (piano giornaliero).

## 4. Variabili d'Ambiente (.env)

Ecco la lista delle variabili necessarie per configurare il backend:

| Variabile | Descrizione | Esempio / Default |
|-----------|-------------|-------------------|
| `PORT` | Porta del server | `3000` |
| `NODE_ENV` | Ambiente (`development`, `production`, `test`) | `development` |
| `JWT_SECRET` | Chiave segreta per firmare i token | `stringa_casuale_lunga` |
| `DATABASE_URL` | Stringa di connessione PostgreSQL (Prod) | `postgres://user:pass@host...` |
| `DB_HOST` | Host DB Locale | `localhost` |
| `DB_USER` | Utente DB Locale | `postgres` |
| `DB_PASSWORD` | Password DB Locale | `password` |
| `DB_DATABASE` | Nome DB Locale | `mentormatch` |

## 5. Logica Database Avanzata

Il progetto utilizza funzionalità avanzate di PostgreSQL per garantire integrità e performance:

*   **Trigger (`fn_update_mentor_rating`):** Ogni volta che viene inserita o modificata una recensione, un trigger ricalcola automaticamente la media voto (`rating_avg`) e il conteggio (`rating_count`) nella tabella `users`. Questo evita query pesanti di aggregazione in tempo reale.
*   **Transazioni:** La creazione delle prenotazioni avviene all'interno di una transazione (`BEGIN` ... `COMMIT`) con lock pessimistico (`FOR UPDATE`) sullo slot di disponibilità, prevenendo overbooking in caso di richieste simultanee.
*   **Vincoli:**
    *   `CHECK (role IN ...)`: Garantisce che i ruoli siano validi.
    *   `UNIQUE (slot_id)` su `bookings`: Impedisce fisicamente doppie prenotazioni.

## 6. Sicurezza

*   **Helmet:** Configurato per impostare header HTTP sicuri (XSS Filter, No-Sniff, HSTS).
*   **JWT:** Autenticazione stateless. I token hanno scadenza breve (1h).
*   **Bcrypt:** Le password sono salvate solo come hash salati.
*   **Validazione Input:** Controllo lato server su tutti i dati in ingresso (es. formato email, lunghezza password, URL meeting).
```
