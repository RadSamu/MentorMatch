const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock di 'pg'
const mockPool = {
  query: jest.fn(),
};
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const app = require('../server');

describe('Review Endpoints', () => {
  let token;
  const menteeId = 1;
  const bookingId = 500;

  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
    token = jwt.sign(
      { user: { id: menteeId, role: 'mentee' } },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POST /api/reviews should create a review for a completed booking', async () => {
    const reviewData = {
      booking_id: bookingId,
      rating: 5,
      comment: 'Ottimo mentor!'
    };

    const mockBooking = {
      id: bookingId,
      mentee_id: menteeId,
      mentor_id: 2,
      status: 'confirmed',
      start_ts: new Date(Date.now() - 86400000).toISOString() // Ieri (passata)
    };

    // Mock intelligente
    mockPool.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      
      if (q.includes('FROM BOOKINGS')) return Promise.resolve({ rows: [mockBooking] });
      if (q.includes('FROM REVIEWS') && q.startsWith('SELECT')) return Promise.resolve({ rows: [] }); // Nessuna recensione esistente
      if (q.startsWith('INSERT INTO REVIEWS')) return Promise.resolve({ rows: [{ id: 1, ...reviewData }] });
      
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(reviewData);

    expect(res.statusCode).toEqual(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.comment).toBe('Ottimo mentor!');
  });

  it('POST /api/reviews should return 400 for invalid rating', async () => {
    const reviewData = {
      booking_id: bookingId,
      rating: 10, // Rating non valido (es. scala 1-5)
      comment: 'Fake'
    };

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(reviewData);

    // Ci aspettiamo un errore client (Bad Request)
    expect(res.statusCode).toBeGreaterThanOrEqual(400);
  });

  it('GET /api/reviews/mentor/:mentorId should return public reviews', async () => {
    const mentorId = 2;

    // Mockiamo le due query in sequenza: 1. COUNT(*), 2. SELECT reviews
    mockPool.query
      .mockResolvedValueOnce({ rows: [{ count: 1 }] })
      .mockResolvedValueOnce({ 
        rows: [{ 
          id: 10, 
          rating: 5, 
          comment: 'Bravo!', 
          mentee_name: 'Mario', 
          created_at: new Date().toISOString() 
        }] 
      });

    const res = await request(app).get(`/api/reviews/mentor/${mentorId}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.pagination).toBeDefined();
  });

  it('POST /api/reviews should return 400 if review already exists', async () => {
    const reviewData = {
      booking_id: bookingId,
      rating: 5,
      comment: 'Duplicate'
    };

    mockPool.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      
      // 1. Verifica Prenotazione (Successo)
      if (q.includes('FROM BOOKINGS')) {
         return Promise.resolve({ 
           rows: [{ id: bookingId, mentee_id: menteeId, mentor_id: 2, start_ts: new Date(Date.now() - 86400000).toISOString() }] 
         });
      }
      
      // 2. Inserimento Recensione (Fallimento per duplicato)
      if (q.startsWith('INSERT INTO REVIEWS')) {
        const err = new Error('Duplicate entry');
        err.code = '23505'; // Codice errore PostgreSQL per violazione unique constraint
        return Promise.reject(err);
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app).post('/api/reviews').set('Authorization', `Bearer ${token}`).send(reviewData);

    expect(res.statusCode).toEqual(400);
    expect(res.body.msg).toMatch(/già lasciato una recensione/);
  });

  it('POST /api/reviews should return 404 if booking not found or not authorized', async () => {
    const reviewData = {
      booking_id: 9999,
      rating: 5,
      comment: 'Ghost booking'
    };

    mockPool.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      if (q.includes('FROM BOOKINGS')) return Promise.resolve({ rows: [] }); // Nessuna prenotazione trovata
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(reviewData);

    expect(res.statusCode).toEqual(404);
    expect(res.body.msg).toMatch(/non trovata/);
  });

  it('POST /api/reviews should return 400 if session is in the future', async () => {
    const reviewData = {
      booking_id: bookingId,
      rating: 5,
      comment: 'Future review'
    };

    mockPool.query.mockImplementation((query) => {
      const q = query.trim().toUpperCase();
      if (q.includes('FROM BOOKINGS')) {
         return Promise.resolve({ 
           rows: [{ 
             id: bookingId, 
             mentee_id: menteeId, 
             mentor_id: 2, 
             start_ts: new Date(Date.now() + 86400000).toISOString() // Domani (Futuro)
           }] 
         });
      }
      return Promise.resolve({ rows: [] });
    });

    const res = await request(app)
      .post('/api/reviews')
      .set('Authorization', `Bearer ${token}`)
      .send(reviewData);

    expect(res.statusCode).toEqual(400);
    expect(res.body.msg).toMatch(/non ancora avvenuta/);
  });
});