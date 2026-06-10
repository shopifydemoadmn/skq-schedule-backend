const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SKQ_CLIENT_ID = process.env.SKQ_CLIENT_ID;
const SKQ_CLIENT_SECRET = process.env.SKQ_CLIENT_SECRET;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { locationCode, carrierCode, claimNumber } = JSON.parse(event.body || '{}');

  const token = await getAccessToken();

  const res = await fetch(
    `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  const data = await res.json();

  return {
    statusCode: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type"
    },
    body: JSON.stringify(data)
  };
};

async function getAccessToken() {
  const res = await fetch(`${SKQ_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${SKQ_CLIENT_ID}&client_secret=${SKQ_CLIENT_SECRET}`
  });

  const json = await res.json();
  return json.access_token;
}
