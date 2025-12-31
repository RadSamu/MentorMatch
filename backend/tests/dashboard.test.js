const request = require('supertest');
const jwt = require('jsonwebtoken');

// Mock di 'pg' (solo pool.query per la dashboard)
const mockPool = {
  query: jest.fn(),
};
jest.mock('pg', () => ({ Pool: jest.fn(() => mockPool) }));

const app = require('../server');

describe('Dashboard Stats', () => {
  let token;
  const menteeId = 1;

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

  it('GET /api/dashboard/stats should return next booking for mentee', async () => {
    // Simuliamo la risposta del DB per la query "nextBooking"
    const mockBooking = {
      id: 10,
      status: 'confirmed',
      price: 30.00,
      start_ts: new Date().toISOString(),
      mentor_name: 'Dr. House',
      mentor_avatar: '/uploads/house.jpg'
    };

    mockPool.query.mockResolvedValue({ rows: [mockBooking] });

    const res = await request(app)
      .get('/api/dashboard/stats')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('nextBooking');
    expect(res.body.nextBooking.mentor_name).toBe('Dr. House');
  });
});