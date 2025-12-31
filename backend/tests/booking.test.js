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

// Mock di 'nodemailer' per evitare errori nell'invio email
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true)
  }),
  getTestMessageUrl: jest.fn()
}));

const app = require('../server');

describe('Booking Endpoints', () => {
  let token;
  const menteeId = 1;
  const availabilityId = 100;

  beforeAll(() => {
    // Generiamo un token valido per un mentee
    process.env.JWT_SECRET = 'test_secret'; // Assicuriamoci che il segreto sia impostato
    token = jwt.sign(
      { user: { id: menteeId, role: 'mentee' } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Implementazione intelligente del mock per gestire la sequenza di query della transazione
    mockClient.query.mockImplementation((query, values) => {
      const q = query.trim().toUpperCase();
      
      // Gestione Transazione
      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) {
        return Promise.resolve();
      }

      // 1. Controllo Ruolo Utente
      if (q.includes('SELECT ROLE FROM USERS')) {
        return Promise.resolve({ rows: [{ role: 'mentee' }] });
      }

      // 2. Selezione Slot (FOR UPDATE)
      if (q.includes('FROM AVAILABILITIES') && q.includes('FOR UPDATE')) {
        return Promise.resolve({ 
          rows: [{ 
            id: availabilityId, 
            mentor_id: 2, 
            start_ts: new Date(Date.now() + 86400000), // Domani
            is_booked: false 
          }] 
        });
      }

      // 3. Aggiornamento Slot (is_booked = true)
      if (q.startsWith('UPDATE AVAILABILITIES')) {
        return Promise.resolve({ rowCount: 1 });
      }

      // 4. Recupero Tariffa Mentor
      if (q.includes('SELECT HOURLY_RATE FROM USERS')) {
        return Promise.resolve({ rows: [{ hourly_rate: 50.00 }] });
      }

      // 5. Controllo Prenotazioni Cancellate
      if (q.includes('FROM BOOKINGS') && q.includes('CANCELED')) {
        return Promise.resolve({ rows: [] });
      }

      // 6. Inserimento Prenotazione
      if (q.startsWith('INSERT INTO BOOKINGS')) {
        return Promise.resolve({ 
          rows: [{ 
            id: 500, 
            slot_id: availabilityId, 
            mentor_id: 2, 
            mentee_id: menteeId, 
            status: 'pending', 
            price: 50.00 
          }] 
        });
      }

      // 7. Recupero Dati Utenti (per notifiche ed email)
      // Rispondiamo con dati generici per qualsiasi select sugli utenti rimanente
      if (q.includes('FROM USERS')) {
        return Promise.resolve({ rows: [{ name: 'Test', surname: 'User', email: 'test@example.com' }] });
      }

      return Promise.resolve({ rows: [] });
    });
  });

  it('POST /api/bookings should create a booking successfully', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ availability_id: availabilityId });

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.status).toBe('pending');
    expect(res.body.price).toBe(50.00);
  });

  it('POST /api/bookings should return 400 if slot is already booked', async () => {
    // Sovrascriviamo il mock per simulare uno slot già prenotato
    mockClient.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) return Promise.resolve();
      if (q.includes('SELECT ROLE')) return Promise.resolve({ rows: [{ role: 'mentee' }] });
      
      // Simuliamo che la SELECT ... FOR UPDATE restituisca is_booked: true
      if (q.includes('FROM AVAILABILITIES') && q.includes('FOR UPDATE')) {
        return Promise.resolve({ 
          rows: [{ 
            id: availabilityId, 
            mentor_id: 2, 
            is_booked: true // <--- GIA' PRENOTATO
          }] 
        });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ availability_id: availabilityId });

    expect(res.statusCode).toEqual(400);
  });

  it('POST /api/bookings should return 404 if slot does not exist', async () => {
    // Sovrascriviamo il mock per simulare slot inesistente
    mockClient.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) return Promise.resolve();
      if (q.includes('SELECT ROLE')) return Promise.resolve({ rows: [{ role: 'mentee' }] });
      
      // Simuliamo che la SELECT ... FOR UPDATE non trovi nulla
      if (q.includes('FROM AVAILABILITIES') && q.includes('FOR UPDATE')) {
        return Promise.resolve({ rows: [] });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ availability_id: 999 });

    expect(res.statusCode).toEqual(404);
  });

  it('POST /api/bookings should return 400 if availability_id is missing', async () => {
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({}); // Payload vuoto

    expect(res.statusCode).toEqual(400);
  });
});