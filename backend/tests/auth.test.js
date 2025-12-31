const request = require('supertest');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
jest.mock('../utils/sendEmail', () => jest.fn()); // Mock per l'invio email

// --- MOCK DEL DATABASE ---
// Creiamo un mock più sofisticato che può gestire sia pool.query che client.query
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
};

const mockPool = {
  connect: jest.fn(() => Promise.resolve(mockClient)),
  query: jest.fn(),
  on: jest.fn(),
};

jest.mock('pg', () => {
  return { Pool: jest.fn(() => mockPool) };
});

const app = require('../server');

describe('Auth Endpoints', () => {
  beforeAll(() => {
    process.env.JWT_SECRET = 'test_secret';
  });

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Impostiamo una risposta di default sicura per evitare crash se ci sono query impreviste
    mockPool.query.mockResolvedValue({ rows: [] });
    mockClient.query.mockResolvedValue({ rows: [] });
  });

  it('POST /api/auth/register should register a new user and return a token', async () => {
    // Dati dell'utente da registrare
    const newUser = {
      name: 'Mario',
      surname: 'Rossi',
      email: 'mario.test@example.com',
      password: 'passwordSicura123',
      role: 'mentee'
    };

    // Simuliamo il comportamento del DB per la registrazione:
    // 1. Prima query: Controllo se l'email esiste -> Restituisce vuoto (nessun utente)
    // 2. Seconda query: Inserimento utente -> Restituisce l'utente creato
    const dbResponseUser = { id: 1, ...newUser, password_hash: 'hashed_secret' };
    
    // Configuriamo il mock per rispondere in sequenza
    // Nota: Mockiamo sia pool che client per essere sicuri di intercettare la chiamata
    const queryMock = mockPool.query; 
    queryMock
      .mockResolvedValueOnce({ rows: [] }) // 1. Check email: non esiste
      .mockResolvedValueOnce({ rows: [dbResponseUser] }); // 2. Insert: successo

    const res = await request(app)
      .post('/api/auth/register')
      .send(newUser);

    // Verifiche
    expect([200, 201]).toContain(res.statusCode); // Accettiamo sia 200 che 201
    expect(res.body).toHaveProperty('token'); // Deve restituire il JWT
  });

  it('POST /api/auth/login should authenticate user and return a token', async () => {
    const userCredentials = {
      email: 'mario.test@example.com',
      password: 'passwordSicura123'
    };

    // Generiamo un hash reale per la password di test
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(userCredentials.password, salt);

    const dbUser = {
      id: 1,
      name: 'Mario',
      surname: 'Rossi',
      email: userCredentials.email,
      password_hash: password_hash,
      role: 'mentee'
    };

    // Simuliamo che l'utente venga trovato nel DB
    mockPool.query.mockResolvedValueOnce({ rows: [dbUser] });

    const res = await request(app).post('/api/auth/login').send(userCredentials);
    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('token');
  });

  it('POST /api/auth/login should return 401 for invalid credentials', async () => {
    const userCredentials = {
      email: 'mario.test@example.com',
      password: 'wrongPassword'
    };

    // Generiamo un hash per una password diversa ("realPassword")
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash('realPassword', salt);

    const dbUser = {
      id: 1,
      email: userCredentials.email,
      password_hash: password_hash,
      role: 'mentee'
    };

    // Troviamo l'utente nel DB, ma la password non corrisponderà
    mockPool.query.mockResolvedValueOnce({ rows: [dbUser] });

    const res = await request(app).post('/api/auth/login').send(userCredentials);
    
    // Ci aspettiamo un errore di autenticazione (400 o 401)
    expect([400, 401]).toContain(res.statusCode);
  });

  it('POST /api/auth/register should return 400 if email already exists', async () => {
    const newUser = {
      name: 'Luigi',
      surname: 'Verdi',
      email: 'existing@example.com',
      password: 'password123',
      role: 'mentee'
    };

    // Simuliamo che l'email esista già (la prima query restituisce un utente)
    mockPool.query.mockResolvedValueOnce({ rows: [{ id: 99, email: newUser.email }] });

    const res = await request(app).post('/api/auth/register').send(newUser);

    expect(res.statusCode).toEqual(400);
  });

  it('POST /api/auth/login should return 400/404 if user does not exist', async () => {
    const userCredentials = {
      email: 'nonexistent@example.com',
      password: 'password123'
    };

    // Il DB restituisce un array vuoto (nessun utente trovato)
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app).post('/api/auth/login').send(userCredentials);
    
    // Ci aspettiamo un errore (solitamente 400 "Invalid Credentials" o 404)
    expect([400, 401, 404]).toContain(res.statusCode);
  });

  it('POST /api/auth/register should return 400 if required fields are missing', async () => {
    const incompleteUser = {
      name: 'Mario',
      // Manca email e password
      role: 'mentee'
    };

    const res = await request(app).post('/api/auth/register').send(incompleteUser);
    expect(res.statusCode).toEqual(400);
  });

  it('GET /api/auth/me should return current user profile', async () => {
    // Generiamo un token valido
    const token = jwt.sign({ user: { id: 1, role: 'mentee' } }, process.env.JWT_SECRET, { expiresIn: '1h' });
    
    // Mockiamo la risposta del DB per l'utente
    mockPool.query.mockResolvedValueOnce({ 
      rows: [{ id: 1, name: 'Mario', email: 'mario.test@example.com', role: 'mentee' }] 
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toEqual(200);
    expect(res.body).toHaveProperty('email', 'mario.test@example.com');
  });

  it('POST /api/auth/forgot-password should send reset email', async () => {
    const email = 'mario.test@example.com';
    
    // Mockiamo la sequenza: 1. Trova utente, 2. Aggiorna token nel DB
    const queryMock = mockPool.query;
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 1, email: email }] }) // Select
      .mockResolvedValueOnce({ rowCount: 1 }); // Update

    const res = await request(app).post('/api/auth/forgot-password').send({ email });

    expect(res.statusCode).toEqual(200);
    expect(res.body.msg).toMatch(/email/i);
  });

  it('PUT /api/auth/reset-password/:token should reset password successfully', async () => {
    const token = 'validtoken123';
    const newPassword = 'newPassword123';
    
    // Mockiamo la sequenza di query:
    // 1. Select user by token (valid and not expired)
    // 2. Update password
    // 3. Clear reset token
    
    const queryMock = mockPool.query;
    queryMock
      .mockResolvedValueOnce({ rows: [{ id: 1, email: 'mario.test@example.com' }] }) // 1. Trovato utente
      .mockResolvedValueOnce({ rowCount: 1 }) // 2. Password aggiornata
      .mockResolvedValueOnce({ rowCount: 1 }); // 3. Token pulito

    const res = await request(app)
      .put(`/api/auth/reset-password/${token}`)
      .send({ password: newPassword });

    expect(res.statusCode).toEqual(200);
    expect(res.body.msg).toMatch(/aggiornata/i);
  });

  it('PUT /api/auth/reset-password/:token should return 400 for invalid/expired token', async () => {
    const token = 'invalidtoken';
    
    // Il DB non trova nessun utente con questo token
    mockPool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put(`/api/auth/reset-password/${token}`)
      .send({ password: 'newPassword123' });

    expect(res.statusCode).toEqual(400);
    expect(res.body.msg).toMatch(/non valido/i);
  });
});