let cachedToken = null;
let tokenExpiresAt = 0;

exports.getAccessToken = async () => {
  const now = Date.now();

  if (cachedToken && now < tokenExpiresAt) {
    return cachedToken;
  }

  const params = new URLSearchParams();
  params.append("client_id", process.env.SKQ_CLIENT_ID);
  params.append("client_secret", process.env.SKQ_CLIENT_SECRET);
  params.append("scope", process.env.SKQ_SCOPE);
  params.append("grant_type", "client_credentials");

  const url = `https://login.microsoftonline.com/${process.env.OAUTH_TENANT_ID}/oauth2/v2.0/token`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params
  });

  const data = await res.json();
  console.log("TOKEN RESPONSE RAW:", data);

  if (!data.access_token) {
    console.error("TOKEN ERROR:", data);
    throw new Error("Failed to obtain access token");
  }

  cachedToken = data.access_token;
  tokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedToken;
};
