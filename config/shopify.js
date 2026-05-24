const crypto = require('crypto');
const qs = require('qs');

function buildAuthUrl(shop, apiKey, scopes, redirectUri) {
  const query = qs.stringify({
    client_id: apiKey,
    scope: scopes,
    redirect_uri: redirectUri,
    state: crypto.randomBytes(16).toString('hex'),
    response_type: 'code'
  });
  return `https://${shop}/admin/oauth/authorize?${query}`;
}

function verifyHmac(query, secret) {
  const { hmac, ...rest } = query;
  const message = qs.stringify(rest, { sort: (a, b) => a.localeCompare(b) });
  const generated = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('hex');
  return generated === hmac;
}

module.exports = {
  buildAuthUrl,
  verifyHmac
};
