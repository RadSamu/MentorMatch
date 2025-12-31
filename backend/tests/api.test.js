const request = require('supertest');
const app = require('../server');

describe('API Smoke Tests', () => {
  it('GET / should return the frontend index.html', async () => {
    const res = await request(app).get('/');
    expect(res.statusCode).toEqual(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
  });

  it('GET /api/unknown should return 404', async () => {
    const res = await request(app).get('/api/unknown-route');
    expect(res.statusCode).toEqual(404);
  });
});