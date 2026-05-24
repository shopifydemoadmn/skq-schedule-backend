const axios = require('axios');
const { getAccessToken } = require('./skqAuth');

const baseURL = process.env.SKQ_API_BASE_URL;

async function client() {
  const token = await getAccessToken();

  return axios.create({
    baseURL,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  });
}

async function findClosestLocation() {
  const api = await client();
  const res = await api.get('/Locations');
  return res.data;
}

async function getTimeslots(locationCode) {
  const api = await client();
  const res = await api.get(`/TimeSlots/${locationCode}`);
  return res.data;
}

async function createAppointment(payload) {
  const api = await client();
  const res = await api.put('/Appointments', payload);
  return res.data;
}

module.exports = {
  findClosestLocation,
  getTimeslots,
  createAppointment
};
