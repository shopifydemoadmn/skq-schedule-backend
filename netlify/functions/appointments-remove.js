const { getAccessToken } = require('./skqAuth');

const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;

exports.handler = async (event) => {
  console.log('[appointments-remove] Received request');

  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
  }

  const { locationCode, carrierCode, claimNumber } = body;

  if (!locationCode || !carrierCode || !claimNumber) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'locationCode, carrierCode, claimNumber are required' })
    };
  }

  console.log('[appointments-remove]', { locationCode, carrierCode, claimNumber });

  let token;
  try {
    token = await getAccessToken();
  } catch (err) {
    console.error('[appointments-remove] OAuth error:', err.message);
    return { statusCode: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify({ error: 'auth_failed' }) };
  }

  const skqUrl = `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`;
  console.log(`[appointments-remove] DELETE ${skqUrl}`);

  const res = await fetch(skqUrl, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });

  const text = await res.text();
  console.log(`[appointments-remove] SKQ status: ${res.status}, body: ${text}`);

  return {
    statusCode: res.status,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    },
    body: text
  };
};
