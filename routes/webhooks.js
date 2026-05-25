const express = require('express');
const router = express.Router();
const { createAppointment, getAppointment } = require('../utils/skqAppointments');

router.post('/orders/paid', async (req, res) => {
  try {
    const order = req.body;

    const line = order.line_items[0];
    const props = {};
    line.properties?.forEach(p => props[p.name] = p.value);

    const locationCode = props.locationCode;
    const carrierCode = props.carrierCode;
    const claimNumber = props.claimNumber;
    const startTime = props.timeslotStart;
    const endTime = props.timeslotEnd;

    console.log('==============================');
    console.log('🧾 ORDER PAID WEBHOOK RECEIVED');
    console.log('Order ID:', order.id);
    console.log('Customer:', order.email);
    console.log('Properties:', props);
    console.log('==============================');

    // ⭐ TEST MODE — НЕ СОЗДАЁМ APPOINTMENT
    if (process.env.SKQ_TEST_MODE === 'true') {
      console.log('🧪 SKQ TEST MODE ENABLED — Appointment NOT created');
      return res.status(200).send('test-mode-ok');
    }

    // ⭐ Normal mode — fallback: check if exists
    try {
      const existing = await getAppointment(locationCode, carrierCode, claimNumber);
      console.log('⚠ Appointment already exists:', existing);
      return res.status(200).send('already-exists');
    } catch (err) {
      console.log('ℹ Appointment not found — creating new one');
    }

    const result = await createAppointment(locationCode, carrierCode, claimNumber, {});
    console.log('✔ Appointment created:', result);

    res.status(200).send('ok');
  } catch (err) {
    console.error('❌ Appointment error:', err.response?.data || err);
    res.status(500).send('error');
  }
});

module.exports = router;
