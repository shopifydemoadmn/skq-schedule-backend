const crypto = require('crypto');
const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SKQ_TEST_MODE = process.env.SKQ_TEST_MODE === 'true';

function verifyHmac(event) {
  const hmacHeader = event.headers['x-shopify-hmac-sha256'] || event.headers['X-Shopify-Hmac-Sha256'];
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(event.body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!verifyHmac(event)) {
    return { statusCode: 401, body: 'Invalid HMAC' };
  }

  const order = JSON.parse(event.body || '{}');

  const line = order.line_items && order.line_items[0];
  const props = {};
  if (line && Array.isArray(line.properties)) {
    line.properties.forEach(p => {
      if (p && p.name) props[p.name] = p.value;
    });
  }

  const locationCode = props.locationCode;
  const carrierCode = props.carrierCode;
  const claimNumber = props.claimNumber;
  const timeslotStart = props.timeslotStart;
  const timeslotEnd = props.timeslotEnd;

  if (SKQ_TEST_MODE) {
    console.log('TEST MODE: order received', {
      orderId: order.id,
      email: order.email,
      locationCode,
      carrierCode,
      claimNumber,
      timeslotStart,
      timeslotEnd
    });

    return { statusCode: 200, body: 'test-mode-ok' };
  }

  const res = await fetch(`${SKQ_API_BASE_URL}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locationCode,
      carrierCode,
      claimNumber,
      timeslotStart,
      timeslotEnd
    })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error('SKQ appointment error:', text);
    return { statusCode: 500, body: 'skq-error' };
  }

  return { statusCode: 200, body: 'ok' };
};
