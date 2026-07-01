const { getAccessToken } = require('./skqAuth');

const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

exports.handler = async (event) => {
  console.log('[appointments-create] Received request');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let order;
  try {
    order = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const orderId = order.id;
  const line = order.line_items && order.line_items[0];

  // Shopify webhook sends properties as array [{name, value}]
  const props = {};
  if (line && Array.isArray(line.properties)) {
    line.properties.forEach(p => {
      if (p && p.name) props[p.name] = p.value;
    });
  }

  const locationCode = props.locationCode;
  const carrierCode = '1';
  const claimNumber = `ORDER-${orderId}`;
  const timeslotStart = props.timeslotStart;
  const timeslotEnd = props.timeslotEnd;

  console.log('[appointments-create] Extracted properties:', { locationCode, carrierCode, claimNumber, timeslotStart });

  if (!locationCode || !timeslotStart) {
    console.warn('[appointments-create] Missing required properties');
    return {
      statusCode: 400,
      body: JSON.stringify({ status: 'error', reason: 'missing_properties' })
    };
  }

  const firstName = order.customer?.first_name || '';
  const lastName = order.customer?.last_name || '';
  const phoneNumber = props.phone || order.customer?.phone || order.billing_address?.phone || '0000000000';
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
    vehicleYear: props.vehicleYear ? parseInt(props.vehicleYear, 10) : 2020,
    vehicleMake: props.vehicleMake || 'Unknown',
    vehicleModel: props.vehicleModel || 'Unknown',
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

  let token;
  try {
    token = await getAccessToken();
    console.log('[appointments-create] OAuth token obtained');
  } catch (err) {
    console.error('[appointments-create] OAuth error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'auth_failed' }) };
  }

  const skqUrl = `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`;
  console.log(`[appointments-create] Calling SKQ API: PUT ${skqUrl}`);

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
    console.log(`[appointments-create] SKQ status: ${skqRes.status}, body: ${skqText}`);
  } catch (err) {
    console.error('[appointments-create] SKQ fetch error:', err.message);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'skq_network_error' }) };
  }

  let skqData = {};
  try {
    skqData = JSON.parse(skqText);
  } catch {
    skqData = { raw: skqText };
  }

  if (orderId && SHOPIFY_STORE_DOMAIN) {
    const note = [
      `[SKQ] Appointment created`,
      `locationCode: ${locationCode}`,
      `carrierCode: ${carrierCode}`,
      `claimNumber: ${claimNumber}`,
      `scheduleId: ${skqData.scheduleId || ''}`,
      `workfileId: ${skqData.workfileId || ''}`,
      `timeslotStart: ${timeslotStart}`,
      `timeslotEnd: ${timeslotEnd || ''}`,
      `createdAt: ${new Date().toISOString()}`
    ].join('\n');

    await fetch(
      `https://${SHOPIFY_STORE_DOMAIN}/admin/api/2024-01/orders/${orderId}.json`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': SHOPIFY_ACCESS_TOKEN
        },
        body: JSON.stringify({ order: { id: orderId, note } })
      }
    );
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ status: 'appointment_created', skqResponse: skqData })
  };
};
