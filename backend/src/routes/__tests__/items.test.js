const express = require('express');
const request = require('supertest');

jest.mock('fs/promises');
const fsp = require('fs/promises');

const itemsRouter = require('../items');

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/items', itemsRouter);
  app.use((err, req, res, next) => {
    res.status(err.status || 500).json({ error: err.message });
  });
  return app;
}

const sampleData = [
  { id: 1, name: 'Laptop Pro', category: 'Electronics', price: 2499 },
  { id: 2, name: 'Noise Cancelling Headphones', category: 'Electronics', price: 399 },
  { id: 3, name: 'Ultra-Wide Monitor', category: 'Electronics', price: 999 },
  { id: 4, name: 'Ergonomic Chair', category: 'Furniture', price: 799 },
  { id: 5, name: 'Standing Desk', category: 'Furniture', price: 1199 }
];

describe('items routes', () => {
  let app;
  let store;

  beforeEach(() => {
    store = JSON.parse(JSON.stringify(sampleData));
    fsp.readFile.mockImplementation(async () => JSON.stringify(store));
    fsp.writeFile.mockImplementation(async (_, raw) => {
      store = JSON.parse(raw);
    });
    app = buildApp();
  });

  afterEach(() => jest.clearAllMocks());

  describe('GET /api/items', () => {
    test('returns all items with pagination meta', async () => {
      const res = await request(app).get('/api/items');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(5);
      expect(res.body.total).toBe(5);
    });

    test('filters with q (case-insensitive)', async () => {
      const res = await request(app).get('/api/items?q=laptop');
      expect(res.status).toBe(200);
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0].name).toBe('Laptop Pro');
      expect(res.body.total).toBe(1);
    });

    test('respects limit and page', async () => {
      const page1 = await request(app).get('/api/items?limit=2&page=1');
      const page2 = await request(app).get('/api/items?limit=2&page=2');
      expect(page1.body.items).toHaveLength(2);
      expect(page2.body.items).toHaveLength(2);
      expect(page1.body.items[0].id).not.toBe(page2.body.items[0].id);
      expect(page1.body.total).toBe(5);
    });

    test('propagates read errors', async () => {
      fsp.readFile.mockRejectedValueOnce(new Error('disk gone'));
      const res = await request(app).get('/api/items');
      expect(res.status).toBe(500);
    });
  });

  describe('GET /api/items/:id', () => {
    test('returns the matching item', async () => {
      const res = await request(app).get('/api/items/2');
      expect(res.status).toBe(200);
      expect(res.body.id).toBe(2);
    });

    test('returns 404 when not found', async () => {
      const res = await request(app).get('/api/items/9999');
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/not found/i);
    });
  });

  describe('POST /api/items', () => {
    test('creates a new item with valid payload', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Webcam', price: 89, category: 'Electronics' });
      expect(res.status).toBe(201);
      expect(res.body.id).toBeDefined();
      expect(res.body.name).toBe('Webcam');
      expect(fsp.writeFile).toHaveBeenCalled();
      expect(store).toHaveLength(6);
    });

    test('rejects payload missing name', async () => {
      const res = await request(app).post('/api/items').send({ price: 10 });
      expect(res.status).toBe(400);
      expect(fsp.writeFile).not.toHaveBeenCalled();
    });

    test('rejects payload with invalid price', async () => {
      const res = await request(app)
        .post('/api/items')
        .send({ name: 'Bad', price: -5 });
      expect(res.status).toBe(400);
    });

    test('rejects empty body', async () => {
      const res = await request(app).post('/api/items').send({});
      expect(res.status).toBe(400);
    });
  });
});