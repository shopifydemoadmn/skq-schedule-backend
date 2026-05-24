const express = require('express');
const axios = require('axios');
const { buildAuthUrl, verifyHmac } = require('../config/shopify');

const router = express.Router();

const shops = {};

router.get('/auth', (req, res) => {
  const { shop } = req.query;
  if (!shop) return res.status(400).send('Missing shop');
  const redirectUri = `${process.env.SHOPIFY_APP_URL}/auth/callback`;
  const url = buildAuthUrl(
    shop,
    process.env.SHOPIFY_API_KEY,
    process.env.SHOPIFY_SCOPES,
    redirectUri
  );
  res.redirect(url);
});

router.get('/auth/callback', async (req, res) => {
  const { shop, code } = req.query;
  if (!shop || !code) return res.status(400).send('Missing params');
  const valid = verifyHmac(req.query, process.env.SHOPIFY_API_SECRET);
  if (!valid) return res.status(400).send('Invalid HMAC');

  const tokenUrl = `https://${shop}/admin/oauth/access_token`;
  const response = await axios.post(tokenUrl, {
    client_id: process.env.SHOPIFY_API_KEY,
    client_secret: process.env.SHOPIFY_API_SECRET,
    code
  });

  shops[shop] = {
    accessToken: response.data.access_token
  };

  res.redirect(`/app?shop=${encodeURIComponent(shop)}`);
});

router.get('/app', (req, res) => {
  res.send('<h1>SKQ backend is running</h1>');
});

function getShopToken(shop) {
  const data = shops[shop];
  return data ? data.accessToken : null;
}

module.exports = {
  router,
  getShopToken
};
