const express = require('express');
const fs = require('fs/promises');
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

async function readData() {
  const raw = await fs.readFile(DATA_PATH, 'utf8');
  return JSON.parse(raw);
}

async function writeData(data) {
  await fs.writeFile(DATA_PATH, JSON.stringify(data, null, 2));
}

// GET /api/items?q=&limit=&page=
router.get('/', async (req, res, next) => {
  try {
    const data = await readData();
    const { q, limit, page } = req.query;
    let results = data;

    if (q) {
      const needle = String(q).toLowerCase();
      results = results.filter(item =>
        item.name && item.name.toLowerCase().includes(needle)
      );
    }

    const total = results.length;

    const parsedLimit = limit ? Math.max(1, parseInt(limit, 10)) : null;
    const parsedPage = page ? Math.max(1, parseInt(page, 10)) : 1;

    if (parsedLimit) {
      const start = (parsedPage - 1) * parsedLimit;
      results = results.slice(start, start + parsedLimit);
    }

    res.json({
      items: results,
      total,
      page: parsedPage,
      limit: parsedLimit || total
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/items/:id
router.get('/:id', async (req, res, next) => {
  try {
    const data = await readData();
    const item = data.find(i => i.id === parseInt(req.params.id, 10));
    if (!item) {
      const err = new Error('Item not found');
      err.status = 404;
      throw err;
    }
    res.json(item);
  } catch (err) {
    next(err);
  }
});

// POST /api/items
router.post('/', async (req, res, next) => {
  try {
    const { name, price, category } = req.body || {};
    if (typeof name !== 'string' || name.trim() === '') {
      const err = new Error('Invalid payload: "name" must be a non-empty string');
      err.status = 400;
      throw err;
    }
    if (typeof price !== 'number' || Number.isNaN(price) || price < 0) {
      const err = new Error('Invalid payload: "price" must be a non-negative number');
      err.status = 400;
      throw err;
    }

    const data = await readData();
    const item = {
      id: Date.now(),
      name: name.trim(),
      price,
      ...(category ? { category } : {})
    };
    data.push(item);
    await writeData(data);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

module.exports = router;