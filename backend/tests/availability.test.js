const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock di 'pg'
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};
const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient)),
  query: jest.fn(),
};
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const app = require('../server');

describe('Availability Endpoints', () => {
  let token;
  const mentorId = 2;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign(
      { user: { id: mentorId, role: 'mentor' } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/availability should create a new slot', async () => {
    // Date future "pulite"
    const start = new Date();
    start.setDate(start.getDate() + 1);
    start.setHours(10, 0, 0, 0);
    const end = new Date(start);
    end.setHours(11, 0, 0, 0);

    const payload = {
      start_time: start.toISOString()
    };

    // Mock Handler specifico per la creazione
    const queryHandler = (query, values) => {
      const q = query.trim().toUpperCase();
      
      // 1. Gestione Transazioni
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].some(cmd => q.startsWith(cmd))) {
        return Promise.resolve();
      }
      
      // 2. INSERT (Creazione slot)
      if (q.startsWith('INSERT')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 101, 
            mentor_id: mentorId, 
            start_ts: start.toISOString(), // Usiamo le variabili locali per sicurezza
            end_ts: end.toISOString(),
            slot_length_minutes: 60,
            is_booked: false 
          }] 
        });
      }

      // 3. Controlli di Sovrapposizione (Overlap)
      // Se la query riguarda le tabelle di disponibilità/prenotazioni O contiene riferimenti temporali
      // restituiamo array vuoto (nessun conflitto).
      if (q.includes('AVAILABILITIES') || q.includes('BOOKINGS') || q.includes('START_TS')) {
        return Promise.resolve({ rows: [] });
      }

      // 4. Controllo Utente/Profilo (Fallback per altre SELECT)
      // Se arriviamo qui, è probabilmente una SELECT sulla tabella users per validare il mentor.
      // Restituiamo un utente completo.
      return Promise.resolve({ 
        rows: [{ 
          id: mentorId, 
          role: 'mentor',
          hourly_rate: '50.00',
          name: 'Test',
          surname: 'Mentor',
          sector: 'IT',
          languages: ['it'],
          bio: 'Bio di test',
          avatar_url: '/uploads/avatar.jpg'
        }] 
      });
    };

    mockPool.query.mockImplementation(queryHandler);
    mockClient.query.mockImplementation(queryHandler);

    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${token}`)
      .send(payload);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
  });

  it('DELETE /api/availability/:id should delete a slot', async () => {
    const slotId = 101;

    // Mock Handler specifico per la cancellazione
    const queryHandler = (query, values) => {
      const q = query.trim().toUpperCase();
      
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].some(cmd => q.startsWith(cmd))) {
        return Promise.resolve();
      }
      
      // DELETE
      if (q.startsWith('DELETE')) {
        return Promise.resolve({ rowCount: 1 });
      }

      // SELECT dello slot specifico (per verificare ownership)
      // Se la query cerca su availabilities, restituiamo lo slot.
      if (q.includes('AVAILABILITIES') && q.startsWith('SELECT')) {
        return Promise.resolve({ 
          rows: [{ 
            id: slotId, 
            mentor_id: mentorId, 
            is_booked: false 
          }] 
        });
      }

      // Fallback per check utente (se presente)
      return Promise.resolve({ 
        rows: [{ 
          id: mentorId, 
          role: 'mentor' 
        }] 
      });
    };

    mockPool.query.mockImplementation(queryHandler);
    mockClient.query.mockImplementation(queryHandler);

    const res = await request(app)
      .delete(`/api/availability/${slotId}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    // Accettiamo messaggi leggermente diversi per robustezza
    expect(res.body.msg).toMatch(/successo/);
  });

  it('POST /api/availability should return 400 if start_time is missing', async () => {
    // Mock minimo per l'auth (il middleware potrebbe cercare l'utente)
    mockPool.query.mockResolvedValue({ rows: [{ id: mentorId, role: 'mentor' }] });
    mockClient.query.mockResolvedValue({ rows: [{ id: mentorId, role: 'mentor' }] });

    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({}); // Payload vuoto

    expect(res.statusCode).toEqual(400);
    expect(res.body).toHaveProperty('msg', 'La data di inizio è richiesta.');
  });

  it('GET /api/availability/me should return mentor slots', async () => {
    const queryHandler = (query) => {
      const q = query.trim().toUpperCase();
      // Se la query è una SELECT sulla tabella availabilities
      if (q.startsWith('SELECT') && q.includes('FROM AVAILABILITIES')) {
        return Promise.resolve({
          rows: [
            { id: 1, mentor_id: mentorId, start_ts: new Date().toISOString(), is_booked: false },
            { id: 2, mentor_id: mentorId, start_ts: new Date().toISOString(), is_booked: true }
          ]
        });
      }
      // Fallback per auth
      return Promise.resolve({ rows: [{ id: mentorId, role: 'mentor' }] });
    };

    mockPool.query.mockImplementation(queryHandler);
    mockClient.query.mockImplementation(queryHandler);

    const res = await request(app)
      .get('/api/availability/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body).toHaveLength(2);
  });

  it('DELETE /api/availability/:id should return 400 if slot is booked or not found', async () => {
    // Simuliamo che la DELETE non trovi nulla o fallisca (rowCount: 0)
    mockPool.query.mockResolvedValue({ rowCount: 0 });
    mockClient.query.mockResolvedValue({ rowCount: 0 });

    const res = await request(app)
      .delete('/api/availability/999') // ID inesistente o non valido
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(400);
    // Verifichiamo che il messaggio contenga una spiegazione dell'errore
    expect(res.body.msg).toMatch(/Impossibile eliminare/);
  });

  it('GET /api/availability/mentor/:mentorId should return public slots for a specific mentor', async () => {
    const targetMentorId = 99;
    
    const queryHandler = (query, values) => {
      const q = query.trim().toUpperCase();
      // Intercettiamo la query pubblica (che cerca is_booked = false)
      if (q.startsWith('SELECT') && q.includes('IS_BOOKED = FALSE')) {
         return Promise.resolve({
          rows: [
            { id: 50, mentor_id: targetMentorId, start_ts: new Date().toISOString(), is_booked: false }
          ]
        });
      }
      return Promise.resolve({ rows: [] });
    };

    mockPool.query.mockImplementation(queryHandler);
    mockClient.query.mockImplementation(queryHandler);

    const res = await request(app).get(`/api/availability/mentor/${targetMentorId}`);

    expect(res.statusCode).toEqual(200);
    expect(Array.isArray(res.body)).toBeTruthy();
    expect(res.body).toHaveLength(1);
    expect(res.body[0].mentor_id).toEqual(targetMentorId);
  });

  it('POST /api/availability should return 401 if no token is provided', async () => {
    const res = await request(app)
      .post('/api/availability')
      .send({ start_time: new Date().toISOString() }); // Payload valido ma senza header Auth

    expect(res.statusCode).toEqual(401);
  });

  it('POST /api/availability should return 400/500 for invalid date format', async () => {
    const res = await request(app)
      .post('/api/availability')
      .set('Authorization', `Bearer ${token}`)
      .send({ start_time: 'questa-non-è-una-data' });

    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });
});