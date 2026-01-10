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
```
