-- Schema MentorMatch (Postgres)
-- Assumptions: PostgreSQL >= 9.5

-- ---------- ENUMS ----------
CREATE TYPE booking_status AS ENUM ('pending','confirmed','canceled','done');

-- ---------- USERS ----------
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role VARCHAR(10) NOT NULL CHECK (role IN ('mentor','mentee','admin')),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(100) NOT NULL,
  surname VARCHAR(100),
  bio TEXT,
  sector VARCHAR(100),                 -- es. "Software Engineering"
  languages TEXT[],                    -- Postgres array of language codes e.g. {'en','it'}
  hourly_rate NUMERIC(8,2) DEFAULT NULL,
  avatar_url TEXT DEFAULT NULL,
  rating_avg NUMERIC(3,2) DEFAULT 0,   -- cached average rating for mentors
  rating_count INTEGER DEFAULT 0,      -- number of ratings for mentors
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  reset_password_token TEXT DEFAULT NULL,
  reset_password_expires TIMESTAMPTZ DEFAULT NULL
);

-- ---------- AVAILABILITIES (slots) ----------
-- Each record represents an available slot proposed by a mentor.
CREATE TABLE availabilities (
  id SERIAL PRIMARY KEY,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  start_ts TIMESTAMPTZ NOT NULL,
  end_ts TIMESTAMPTZ NOT NULL,
  slot_length_minutes INTEGER NOT NULL DEFAULT 60,
  is_booked BOOLEAN NOT NULL DEFAULT false,
  meeting_link TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CHECK (end_ts > start_ts)
);

-- Index for searching by time and mentor
CREATE INDEX idx_avail_start ON availabilities (start_ts);
CREATE INDEX idx_avail_mentor ON availabilities (mentor_id);

-- ---------- BOOKINGS ----------
-- A booking references a specific availability slot.
CREATE TABLE bookings (
  id SERIAL PRIMARY KEY,
  slot_id INTEGER NOT NULL REFERENCES availabilities(id) ON DELETE CASCADE,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  status booking_status NOT NULL DEFAULT 'pending',
  meeting_link TEXT DEFAULT NULL,      -- URL for Zoom/Meet or placeholder
  price NUMERIC(8,2) DEFAULT 0,        -- price charged (0 if free)
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT booking_unique_slot UNIQUE (slot_id) -- one booking per slot (enforced)
);

CREATE INDEX idx_bookings_mentee ON bookings (mentee_id);
CREATE INDEX idx_bookings_mentor ON bookings (mentor_id);

-- ---------- REVIEWS ----------
-- Reviews are attached to bookings; mentor can be reviewed only once per booking.
CREATE TABLE reviews (
  id SERIAL PRIMARY KEY,
  booking_id INTEGER UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  mentor_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mentee_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reviews_mentor ON reviews (mentor_id);

-- ---------- FAVORITES ----------
CREATE TABLE favorites (
  mentee_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  mentor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (mentee_id, mentor_id)
);

-- Trigger function to maintain rating_avg and rating_count on users (for mentors)
CREATE OR REPLACE FUNCTION fn_update_mentor_rating() RETURNS TRIGGER AS $$
DECLARE
  agg RECORD;
BEGIN
  -- Recompute aggregate for mentor
  SELECT COUNT(*) AS cnt, AVG(rating)::numeric(3,2) AS avg INTO agg
  FROM reviews
  WHERE mentor_id = NEW.mentor_id;

  IF FOUND THEN
    UPDATE users
    SET rating_avg = COALESCE(agg.avg, 0),
        rating_count = COALESCE(agg.cnt, 0),
        updated_at = now()
    WHERE id = NEW.mentor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- For insert and update on reviews
CREATE TRIGGER trg_reviews_insert_update
AFTER INSERT OR UPDATE ON reviews
FOR EACH ROW EXECUTE PROCEDURE fn_update_mentor_rating();

-- For delete on reviews: recompute using OLD.mentor_id
CREATE OR REPLACE FUNCTION fn_update_mentor_rating_on_delete() RETURNS TRIGGER AS $$
DECLARE
  agg RECORD;
BEGIN
  SELECT COUNT(*) AS cnt, AVG(rating)::numeric(3,2) AS avg INTO agg
  FROM reviews
  WHERE mentor_id = OLD.mentor_id;

  UPDATE users
  SET rating_avg = COALESCE(agg.avg, 0),
      rating_count = COALESCE(agg.cnt, 0),
      updated_at = now()
  WHERE id = OLD.mentor_id;

  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_reviews_delete
AFTER DELETE ON reviews
FOR EACH ROW EXECUTE PROCEDURE fn_update_mentor_rating_on_delete();

-- ---------- NOTIFICATIONS ----------
-- Simple notification inbox for users (email delivery handled by backend).
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,      -- example: 'booking_confirmed', 'booking_canceled'
  payload JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifications_user ON notifications (user_id);

-- ---------- MESSAGES (optional, for dashboard) ----------
CREATE TABLE messages (
  id SERIAL PRIMARY KEY,
  from_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  to_user INTEGER REFERENCES users(id) ON DELETE SET NULL,
  subject VARCHAR(255),
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_to_user ON messages (to_user);

-- ---------- AUX: audit trigger for updated_at on users and availabilities ----------
CREATE OR REPLACE FUNCTION fn_set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_update
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

CREATE TRIGGER trg_avail_update
BEFORE UPDATE ON availabilities
FOR EACH ROW EXECUTE PROCEDURE fn_set_updated_at();

-- ---------- VIEWS (helper) ----------
-- View to get mentor profile with average rating and number of upcoming slots
CREATE VIEW mentor_profiles AS
SELECT
  u.id,
  u.name,
  u.surname,
  u.email,
  u.bio,
  u.sector,
  u.languages,
  u.hourly_rate,
  u.avatar_url,
  u.rating_avg,
  u.rating_count,
  (SELECT COUNT(*) FROM availabilities a WHERE a.mentor_id = u.id AND a.start_ts > now() AND a.is_booked = false) AS upcoming_slots
FROM users u
WHERE u.role = 'mentor';

-- ---------- END ----------
