const crypto = require('crypto');
const { getAccessToken } = require('./skqAuth');

const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;
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

function parseProperties(line) {
  const props = {};
  if (line && Array.isArray(line.properties)) {
    line.properties.forEach(p => {
      if (p && p.name) props[p.name] = p.value;
    });
  }
  return props;
}

async function getOrderNote(orderId) {
  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders/${orderId}.json?fields=note`,
    {
      headers: { 'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN }
    }
  );
  if (!res.ok) return '';
  const data = await res.json();
  return data.order?.note || '';
}

async function appendOrderNote(orderId, newNote) {
  console.log(`[NOTE] Appending note to order ${orderId}`);
  const existing = await getOrderNote(orderId);
  const combined = existing ? `${existing}\n\n---\n${newNote}` : newNote;

  const res = await fetch(
    `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders/${orderId}.json`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
      },
      body: JSON.stringify({ order: { id: orderId, note: combined } })
    }
  );

  if (!res.ok) {
    const text = await res.text();
    console.error(`[NOTE] Failed to write note: ${res.status} ${text}`);
  } else {
    console.log(`[NOTE] Note saved successfully`);
  }
}

exports.handler = async (event) => {
  console.log('[orders-paid] Received request');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!verifyHmac(event)) {
    console.error('[orders-paid] HMAC verification failed');
    return { statusCode: 401, body: 'Invalid HMAC' };
  }
  console.log('[orders-paid] HMAC verified OK');

  let order;
  try {
    order = JSON.parse(event.body || '{}');
  } catch (e) {
    console.error('[orders-paid] Failed to parse order JSON:', e.message);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const orderId = order.id;
  const orderName = order.name || `#${orderId}`;
  console.log(`[orders-paid] Processing order ${orderName} (id: ${orderId})`);

  const line = order.line_items && order.line_items[0];
  const props = parseProperties(line);

  const locationCode = props.locationCode;
  const carrierCode = props.carrierCode;
  const claimNumber = props.claimNumber;
  const timeslotStart = props.timeslotStart;
  const timeslotEnd = props.timeslotEnd;
  const vehicleYear = props.vehicleYear ? parseInt(props.vehicleYear, 10) : null;
  const vehicleMake = props.vehicleMake || null;
  const vehicleModel = props.vehicleModel || null;

  console.log('[orders-paid] Extracted line_item properties:', {
    locationCode, carrierCode, claimNumber, timeslotStart, timeslotEnd,
    vehicleYear, vehicleMake, vehicleModel
  });

  if (!locationCode || !carrierCode || !claimNumber || !timeslotStart) {
    const missing = [];
    if (!locationCode) missing.push('locationCode');
    if (!carrierCode) missing.push('carrierCode');
    if (!claimNumber) missing.push('claimNumber');
    if (!timeslotStart) missing.push('timeslotStart');

    console.warn('[orders-paid] Missing required properties:', missing.join(', '));
    await appendOrderNote(orderId, `[SKQ] Appointment NOT created — missing properties: ${missing.join(', ')}`);
    return { statusCode: 200, body: JSON.stringify({ status: 'skipped', reason: 'missing_properties', missing }) };
  }

  if (SKQ_TEST_MODE) {
    console.log('[orders-paid] TEST MODE — skipping SKQ API call');
    await appendOrderNote(orderId, `[SKQ TEST MODE] Would create appointment:\nlocationCode: ${locationCode}\ncarrierCode: ${carrierCode}\nclaimNumber: ${claimNumber}\ntimeslotStart: ${timeslotStart}`);
    return { statusCode: 200, body: JSON.stringify({ status: 'test_mode_ok' }) };
  }

  const firstName = order.customer?.first_name || '';
  const lastName = order.customer?.last_name || '';
  const phoneNumber = order.customer?.phone || '';
  const email = order.email || '';
  const zipCode = order.shipping_address?.zip || '';
  const address = order.shipping_address?.address1 || '';
  const city = order.shipping_address?.city || '';
  const state = order.shipping_address?.province_code || '';

  const appointmentBody = {
    firstName,
    lastName,
    phoneNumber,
    email,
    commPreference: 'Phone',
    vehicleYear: vehicleYear || 2020,
    vehicleMake: vehicleMake || 'Unknown',
    vehicleModel: vehicleModel || 'Unknown',
    zipCode,
    address,
    city,
    state,
    appointmentDateTime: timeslotStart,
    appointmentType: 'Drop-off',
    sendConfirmations: true,
    rentalRequested: false,
    datasourceId: 1
  };

  console.log('[orders-paid] Appointment body:', JSON.stringify(appointmentBody));

  let token;
  try {
    token = await getAccessToken();
    console.log('[orders-paid] OAuth token obtained');
  } catch (err) {
    console.error('[orders-paid] Failed to get OAuth token:', err.message);
    await appendOrderNote(orderId, `[SKQ ERROR] Failed to get OAuth token: ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'auth_failed' }) };
  }

  const skqUrl = `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`;
  console.log(`[orders-paid] Calling SKQ API: PUT ${skqUrl}`);

  let skqRes;
  let skqText;
  try {
    skqRes = await fetch(skqUrl, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(appointmentBody)
    });
    skqText = await skqRes.text();
    console.log(`[orders-paid] SKQ response status: ${skqRes.status}`);
    console.log(`[orders-paid] SKQ response body: ${skqText}`);
  } catch (err) {
    console.error('[orders-paid] SKQ fetch failed:', err.message);
    await appendOrderNote(orderId, `[SKQ ERROR] Network error calling SKQ API: ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'skq_network_error' }) };
  }

  let skqData = {};
  try {
    skqData = JSON.parse(skqText);
  } catch {
    skqData = { raw: skqText };
  }

  if (!skqRes.ok) {
    console.error(`[orders-paid] SKQ returned error ${skqRes.status}:`, skqText);
    await appendOrderNote(orderId,
      `[SKQ ERROR] Appointment creation failed (HTTP ${skqRes.status})\nlocationCode: ${locationCode}\ncarrierCode: ${carrierCode}\nclaimNumber: ${claimNumber}\nResponse: ${skqText}`
    );
    return { statusCode: 200, body: JSON.stringify({ status: 'skq_error', skqStatus: skqRes.status, skqResponse: skqData }) };
  }

  const scheduleId = skqData.scheduleId || '';
  const workfileId = skqData.workfileId || '';
  console.log(`[orders-paid] Appointment created — scheduleId: ${scheduleId}, workfileId: ${workfileId}`);

  const note = [
    `[SKQ] Appointment created successfully`,
    `locationCode: ${locationCode}`,
    `carrierCode: ${carrierCode}`,
    `claimNumber: ${claimNumber}`,
    `scheduleId: ${scheduleId}`,
    `workfileId: ${workfileId}`,
    `timeslotStart: ${timeslotStart}`,
    `timeslotEnd: ${timeslotEnd || ''}`,
    `createdAt: ${new Date().toISOString()}`
  ].join('\n');

  await appendOrderNote(orderId, note);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'appointment_created',
      scheduleId,
      workfileId,
      skqResponse: skqData
    })
  };
};
