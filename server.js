require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors'); // ← добавили
const { router: authRouter } = require('./routes/auth');
const skqRouter = require('./routes/skq');
const webhooksRouter = require('./routes/webhooks');

const app = express();

// ⭐ CORS ДОЛЖЕН БЫТЬ ПЕРВЫМ
app.use(cors({
  origin: [
    'https://pro-2026.myshopify.com',
    'https://pro-2026.myshopify.com/*'
  ],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
}));

app.options('*', cors()); // ← разрешаем preflight

app.use(cookieParser());
app.use(express.json());

app.get('/', (req, res) => {
  res.send('<h1>SKQ backend is running</h1>');
});

app.use('/webhooks/orders/paid', express.raw({ type: 'application/json' }));
app.use(express.json());
app.use('/', authRouter);
app.use('/skq', skqRouter);
app.use('/webhooks', webhooksRouter);

const port = process.env.PORT || 10000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
