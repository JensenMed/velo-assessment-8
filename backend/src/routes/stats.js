const express = require('express');
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const router = express.Router();
const DATA_PATH = path.join(__dirname, '../../../data/items.json');

let cache = null;

function computeStats(items) {
  if (!items.length) {
    return { total: 0, averagePrice: 0 };
  }
  const total = items.length;
  const sum = items.reduce((acc, cur) => acc + (cur.price || 0), 0);
  return { total, averagePrice: sum / total };
}

async function refreshCache() {
  const raw = await fsp.readFile(DATA_PATH, 'utf8');
  const items = JSON.parse(raw);
  cache = computeStats(items);
  return cache;
}

// Invalidate cache when the data file changes.
try {
  fs.watch(DATA_PATH, { persistent: false }, () => {
    cache = null;
  });
} catch (_) {
  // fs.watch may be unavailable in some test environments; cache will simply
  // refresh on the next request via the null check below.
}

// GET /api/stats
router.get('/', async (req, res, next) => {
  try {
    if (!cache) {
      await refreshCache();
    }
    res.json(cache);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
module.exports.__test__ = { computeStats, refreshCache, invalidate: () => { cache = null; } };