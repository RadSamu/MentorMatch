# Schema ER - MentorMatch

## Diagramma Entità-Relazione

```mermaid
erDiagram
    USERS ||--o{ AVAILABILITIES : "creates"
    USERS ||--o{ BOOKINGS : "mentors"
    USERS ||--o{ BOOKINGS : "mentees"
    USERS ||--o{ REVIEWS : "reviews"
    USERS ||--o{ FAVORITES : "favorited_by"
    USERS ||--o{ FAVORITES : "favorites"
    USERS ||--o{ NOTIFICATIONS : "receives"
    USERS ||--o{ MESSAGES : "sends"
    USERS ||--o{ MESSAGES : "receives"
    AVAILABILITIES ||--|| BOOKINGS : "has"
    BOOKINGS ||--o| REVIEWS : "has"

    USERS {
        int id PK
        string role "mentor, mentee, admin"
        string email UK
        string gender
        string password_hash
        string name
        string surname
        text bio
        string sector
        text[] languages
        decimal hourly_rate
        string avatar_url
        decimal rating_avg
        int rating_count
        timestamp created_at
        timestamp updated_at
        string reset_password_token
        timestamp reset_password_expires
    }

    AVAILABILITIES {
        int id PK
        int mentor_id FK
        timestamp start_ts
        timestamp end_ts
        int slot_length_minutes
        boolean is_booked
        string meeting_link
        timestamp created_at
        timestamp updated_at
    }

    BOOKINGS {
        int id PK
        int slot_id FK "UK"
        int mentor_id FK
        int mentee_id FK
        string status "pending, confirmed, canceled, done"
        string meeting_link
        decimal price
        timestamp created_at
        timestamp updated_at
    }

    REVIEWS {
        int id PK
        int booking_id FK "UK"
        int mentor_id FK
        int mentee_id FK
        int rating "1-5"
        text comment
        timestamp created_at
    }

    FAVORITES {
        int mentee_id FK "PK"
        int mentor_id FK "PK"
        timestamp created_at
    }

    NOTIFICATIONS {
        int id PK
        int user_id FK
        string type
        jsonb payload
        boolean is_read
        timestamp created_at
    }

    MESSAGES {
        int id PK
        int from_user FK
        int to_user FK
        string subject
        text body
        boolean is_read
        timestamp created_at
    }
```

## Descrizione delle Entità

| Entità | Descrizione |
|--------|-------------|
| **USERS** | Utenti del sistema (mentor, mentee, admin). Contiene info profilo, rating e credenziali |
| **AVAILABILITIES** | Slot di disponibilità creati dai mentor per offrire sessioni |
| **BOOKINGS** | Prenotazioni di sessioni (mentee prenota uno slot di availability) |
| **REVIEWS** | Recensioni lasciate dai mentee dopo una sessione completata (1 per booking) |
| **FAVORITES** | Relazione molti-a-molti per aggiungere mentor ai preferiti |
| **NOTIFICATIONS** | Notifiche agli utenti (booking confermato, cancellato, etc.) |
| **MESSAGES** | Messaggi tra utenti per comunicazione diretta |

## Relazioni Principali

1. **Users → Availabilities** (1:N) - Un mentor crea molti slot
2. **Availabilities → Bookings** (1:1) - Un slot ha massimo una prenotazione
3. **Bookings → Reviews** (1:1) - Una prenotazione ha massimo una recensione
4. **Users → Bookings** (1:N) - Un mentor/mentee può avere molte prenotazioni
5. **Favorites** (N:N) - Molti-a-molti tra mentee e mentor preferiti
6. **Notifications** (1:N) - Un utente riceve molte notifiche
7. **Messages** (1:N) - Un utente invia/riceve molti messaggi

## Vincoli Importanti

- **UNIQUE**: email (USERS), slot_id (BOOKINGS), booking_id (REVIEWS)
- **FOREIGN KEYS**: Cascata su DELETE per mantenere integrità referenziale
- **CHECK**: role IN ('mentor', 'mentee', 'admin'), rating 1-5
- **TRIGGERS**: Aggiornamento automatico di rating_avg e rating_count per mentor
