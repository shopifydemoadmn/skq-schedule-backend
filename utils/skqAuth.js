const axios = require('axios');
const qs = require('qs');

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const tenantId = process.env.OAUTH_TENANT_ID;
  const clientId = process.env.SKQ_CLIENT_ID;
  const clientSecret = process.env.SKQ_CLIENT_SECRET;
  const scope = process.env.SKQ_SCOPE;

  const url = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;

  const data = qs.stringify({
    client_id: clientId,
    client_secret: clientSecret,
    scope: scope,
    grant_type: 'client_credentials'
  });

  const res = await axios.post(url, data, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
  });

  cachedToken = res.data.access_token;
  tokenExpiresAt = now + (res.data.expires_in - 60) * 1000;

  return cachedToken;
}

module.exports = { getAccessToken };
