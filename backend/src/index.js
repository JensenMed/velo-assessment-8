const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const express = require('express');
const itemsRouter = require('./routes/items');
const statsRouter = require('./routes/stats');
const { notFound } = require('./middleware/errorHandler');

const app = express();
const port = process.env.PORT || 3001;

app.use(cors({ origin: 'http://localhost:3000' }));

// Basic middleware
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/items', itemsRouter);
app.use('/api/stats', statsRouter);

// Centralised error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

// Not Found
app.use('*', notFound);

if (require.main === module) {
  app.listen(port, () => console.log('Backend running on http://localhost:' + port));
}

module.exports = app;