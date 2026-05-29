const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const { zip } = JSON.parse(event.body || '{}');

  if (!zip) {
    return {
      statusCode: 400,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ZIP is required' })
    };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    zip
  )}&key=${GOOGLE_MAPS_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  const first = data.results && data.results[0];
  const loc = first && first.geometry && first.geometry.location;

  if (!loc) {
    return {
      statusCode: 404,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: 'ZIP not found' })
    };
  }

  return {
    statusCode: 200,
    headers: { 'Access-Control-Allow-Origin': '*' },
    body: JSON.stringify({ lat: loc.lat, lng: loc.lng })
  };
};
