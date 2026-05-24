const express = require('express');
const crypto = require('crypto');

const router = express.Router();

router.post('/orders/paid', express.raw({ type: 'application/json' }), (req, res) => {
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  const body = req.body;

  const digest = crypto
    .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
    .update(body, 'utf8')
    .digest('base64');

  if (digest !== hmac) {
    console.log('❌ Invalid webhook HMAC');
    return res.status(401).send('Invalid HMAC');
  }

  const json = JSON.parse(body.toString('utf8'));

  console.log('📦 ORDER PAID WEBHOOK RECEIVED');
  console.log(JSON.stringify(json, null, 2));

  res.status(200).send('OK');
});

module.exports = router;
