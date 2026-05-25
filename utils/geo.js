const axios = require('axios');

async function getCoordsByZip(zip) {
  const key = process.env.GOOGLE_MAPS_API_KEY;

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${zip}&key=${key}`;

  const res = await axios.get(url);

  if (!res.data.results.length) return null;

  return res.data.results[0].geometry.location; // { lat, lng }
}

module.exports = { getCoordsByZip };
