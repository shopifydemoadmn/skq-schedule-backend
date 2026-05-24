const axios = require('axios');

const baseURL = process.env.SKQ_API_BASE_URL;
const apiKey = process.env.SKQ_API_KEY;

function client() {
  return axios.create({
    baseURL,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    }
  });
}

async function findClosestLocation(payload) {
  const res = await client().post('/locations/search', payload);
  return res.data;
}

async function getTimeslots(locationId, payload) {
  const res = await client().post(`/locations/${locationId}/timeslots`, payload);
  return res.data;
}

async function createAppointment(payload) {
  const res = await client().put('/appointments', payload);
  return res.data;
}

module.exports = {
  findClosestLocation,
  getTimeslots,
  createAppointment
};
