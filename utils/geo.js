const axios = require('axios');

async function getCoordsByZip(zip) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  console.log('🔑 KEY exists:', !!key);
  console.log('📮 ZIP:', zip);

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${key}`;

  const res = await axios.get(url);

  console.log('🌍 Google status:', res.data.status);
  console.log('🌍 Google results:', res.data.results);

  if (!res.data.results.length) return null;

  return res.data.results[0].geometry.location;
}

module.exports = { getCoordsByZip };

