require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const { router: authRouter } = require('./routes/auth');
const skqRouter = require('./routes/skq');
const webhooksRouter = require('./routes/webhooks');

const app = express();

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
