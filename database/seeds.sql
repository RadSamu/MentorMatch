-- seeds.sql (demo)
TRUNCATE TABLE reviews, bookings, availabilities, notifications, messages, sessions, users RESTART IDENTITY CASCADE;

-- Sample mentors and mentee (password_hash placeholders)
INSERT INTO users (role, email, password_hash, name, surname, bio, sector, languages, hourly_rate, avatar_url)
VALUES
('mentor','alice.mentor@example.com','$2b$10$HASHEDPASSWORD1','Alice','Rossi','Senior backend developer and mentor','Software Engineering',ARRAY['en','it'],30.00,'https://example.com/avatars/alice.jpg'),
('mentor','bob.mentor@example.com','$2b$10$HASHEDPASSWORD2','Bob','Bianchi','Product manager with startup experience','Product Management',ARRAY['en'],40.00,'https://example.com/avatars/bob.jpg'),
('mentee','carlo.mentee@example.com','$2b$10$HASHEDPASSWORD3','Carlo','Verdi','Junior dev','',ARRAY['it'],NULL,NULL);

-- Availabilities
INSERT INTO availabilities (mentor_id, start_ts, end_ts, slot_length_minutes) VALUES
(1, now() + INTERVAL '2 days' + INTERVAL '10 hours', now() + INTERVAL '2 days' + INTERVAL '11 hours', 60),
(1, now() + INTERVAL '3 days' + INTERVAL '14 hours', now() + INTERVAL '3 days' + INTERVAL '15 hours', 60),
(2, now() + INTERVAL '1 day' + INTERVAL '9 hours', now() + INTERVAL '1 day' + INTERVAL '10 hours', 60);

-- Optional booking
INSERT INTO bookings (slot_id, mentor_id, mentee_id, status, meeting_link, price)
VALUES
(1,1,3,'confirmed','https://meet.example.com/session/abc123',30.00);

-- Optional review
INSERT INTO reviews (booking_id, mentor_id, mentee_id, rating, comment)
VALUES
(1,1,3,5,'Ottima sessione, consigli pratici utilissimi.');
