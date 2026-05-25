require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const skqRouter = require('./routes/skq');
const webhooksRouter = require('./routes/webhooks');
const { getCoordsByZip } = require('./utils/geo');

const app = express();

// ⭐ CORS первым
app.use(cors({
  origin: [
    'https://pro-2026.myshopify.com',
    'https://pro-2026.myshopify.com/*'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

// ⭐ JSON-парсер ДОЛЖЕН быть до всех POST маршрутов
app.use(express.json());

// ⭐ Cookie parser можно после JSON
app.use(cookieParser());

/* ---------------- GEO ROUTE ---------------- */
app.post('/geo/zip', async (req, res) => {
  try {
    console.log('📮 req.body:', req.body);

    if (!req.body || !req.body.zip) {
      return res.status(400).json({ error: 'ZIP_NOT_PROVIDED' });
    }

    const { zip } = req.body;

    const coords = await getCoordsByZip(zip);

    if (!coords) {
      return res.status(404).json({ error: 'ZIP not found' });
    }

    res.json(coords);
  } catch (err) {
    console.error('Geo error:', err);
    res.status(500).json({ error: 'Geo lookup failed' });
  }
});

/* ---------------- RAW WEBHOOKS ---------------- */
app.use('/webhooks/orders/paid', express.raw({ type: 'application/json' }));

// ⭐ JSON-парсер снова после raw — это нормально
app.use(express.json());

/* ---------------- ROUTES ---------------- */
app.use('/', authRouter);
app.use('/skq', skqRouter);
app.use('/webhooks', webhooksRouter);

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
