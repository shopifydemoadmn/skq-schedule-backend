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

async function findClosestLocation() {
  const res = await client().get('/Locations');
  return res.data;
}

async function getTimeslots(locationCode) {
  const res = await client().get(`/TimeSlots/${locationCode}`);
  return res.data;
}

async function createAppointment(payload) {
  const res = await client().put('/Appointments', payload);
  return res.data;
}

module.exports = {
  findClosestLocation,
  getTimeslots,
  createAppointment
};
