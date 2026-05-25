require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const { router: authRouter } = require('./routes/auth');
const skqRouter = require('./routes/skq');
const webhooksRouter = require('./routes/webhooks');
const { getCoordsByZip } = require('./utils/geo');

const app = express();

// ⭐ CORS должен быть самым первым
app.use(cors({
  origin: [
    'https://pro-2026.myshopify.com',
    'https://pro-2026.myshopify.com/*'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.post('/geo/zip', async (req, res) => {
  try {
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

app.options('*', cors());

app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>SKQ backend is running</h1>');
});

// Webhooks должны принимать raw body
app.use('/webhooks/orders/paid', express.raw({ type: 'application/json' }));

// JSON парсер после raw
app.use(express.json());

app.use('/', authRouter);
app.use('/skq', skqRouter);
app.use('/webhooks', webhooksRouter);

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
