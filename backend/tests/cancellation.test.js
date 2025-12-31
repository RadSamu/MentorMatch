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

// Mock di 'nodemailer'
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue(true)
  }),
  getTestMessageUrl: jest.fn()
}));

const app = require('../server');

describe('Booking Cancellation', () => {
  let token;
  const menteeId = 1;
  const bookingId = 500;
  const slotId = 100;

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

    // Mock intelligente per gestire la transazione di cancellazione
    mockClient.query.mockImplementation((query, values) => {
      const q = query.trim().toUpperCase();

      // Gestione Transazione
      if (q.startsWith('BEGIN') || q.startsWith('COMMIT') || q.startsWith('ROLLBACK')) {
        return Promise.resolve();
      }

      // 1. Recupero prenotazione (SELECT ... FOR UPDATE)
      if (q.includes('FROM BOOKINGS') && q.includes('FOR UPDATE')) {
        return Promise.resolve({
          rows: [{
            id: bookingId,
            mentor_id: 2,
            mentee_id: menteeId,
            slot_id: slotId,
            status: 'confirmed', // Stato iniziale
            start_ts: new Date()
          }]
        });
      }

      // 2. Aggiornamento stato prenotazione (UPDATE bookings)
      if (q.startsWith('UPDATE BOOKINGS')) {
        return Promise.resolve({
          rows: [{ id: bookingId, status: 'canceled' }]
        });
      }

      // 3. Liberazione slot (UPDATE availabilities)
      if (q.startsWith('UPDATE AVAILABILITIES')) {
        return Promise.resolve({ rowCount: 1 });
      }

      // 4. Recupero dati utente per notifiche
      if (q.includes('FROM USERS')) {
        return Promise.resolve({
          rows: [{ name: 'Test', surname: 'User', email: 'test@example.com' }]
        });
      }

      // Default
      return Promise.resolve({ rows: [] });
    });
  });

  it('PUT /api/bookings/:id/cancel should cancel a booking and free the slot', async () => {
    const res = await request(app)
      .put(`/api/bookings/${bookingId}/cancel`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body.msg).toBe('Prenotazione cancellata con successo.');
    expect(res.body.booking.status).toBe('canceled');
  });
});