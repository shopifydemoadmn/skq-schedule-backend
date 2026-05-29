const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { locationCode, carrierCode, claimNumber } = JSON.parse(event.body || '{}');

  const res = await fetch(`${SKQ_API_BASE_URL}/appointments/remove`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ locationCode, carrierCode, claimNumber })
  });

  const data = await res.json();

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify(data)
  };
};
