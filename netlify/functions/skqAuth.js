const fetch = require("node-fetch");

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("client_id", process.env.SKQ_CLIENT_ID);
  params.append("client_secret", process.env.SKQ_CLIENT_SECRET);
  params.append("scope", process.env.SKQ_SCOPE);
  params.append("grant_type", "client_credentials");

  const res = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const data = await res.json();

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedToken;
}

module.exports = { getAccessToken };
