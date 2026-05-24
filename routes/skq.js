const express = require('express');
const { getShopToken } = require('./auth');
const { findClosestLocation, getTimeslots, createAppointment } = require('../utils/skqClient');

const router = express.Router();

router.use((req, res, next) => {
  next();
});


router.post('/locations', async (req, res) => {
  try {
    const data = await findClosestLocation(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'SKQ locations error' });
  }
});

router.post('/timeslots', async (req, res) => {
  try {
    const { locationId, ...rest } = req.body;
    const data = await getTimeslots(locationId, rest);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'SKQ timeslots error' });
  }
});

router.post('/appointments', async (req, res) => {
  try {
    const data = await createAppointment(req.body);
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'SKQ appointment error' });
  }
});

module.exports = router;
