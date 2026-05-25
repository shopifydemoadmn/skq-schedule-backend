const axios = require('axios');
const { getToken } = require('./skqAuth');

async function client() {
  const token = await getToken();

  return axios.create({
    baseURL: 'https://skq-scheduling-api.crash-cloud.com',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json'
    }
  });
}

async function createAppointment(locationCode, carrierCode, claimNumber, body = {}) {
  const api = await client();
  const res = await api.put(`/Appointments/${locationCode}/${carrierCode}/${claimNumber}`, body);
  return res.data;
}

async function getAppointment(locationCode, carrierCode, claimNumber) {
  const api = await client();
  const res = await api.get(`/Appointments/${locationCode}/${carrierCode}/${claimNumber}`);
  return res.data;
}

async function deleteAppointment(locationCode, carrierCode, claimNumber) {
  const api = await client();
  const res = await api.delete(`/Appointments/${locationCode}/${carrierCode}/${claimNumber}`);
  return res.data;
}

module.exports = { createAppointment, getAppointment, deleteAppointment };
