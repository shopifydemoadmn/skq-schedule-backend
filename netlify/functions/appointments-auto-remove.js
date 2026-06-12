const crypto = require('crypto');
const { getAccessToken } = require('./skqAuth');

const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;
const SHOPIFY_STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN;

function verifyHmac(event) {
  const hmacHeader = event.headers['x-shopify-hmac-sha256'] || event.headers['X-Shopify-Hmac-Sha256'];
  if (!hmacHeader) return false;

  const digest = crypto
    .createHmac('sha256', SHOPIFY_WEBHOOK_SECRET)
    .update(event.body, 'utf8')
    .digest('base64');

  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(hmacHeader));
}

function extractFromNote(note, key) {
  const match = note.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match ? match[1].trim() : null;
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
  console.log('[appointments-auto-remove] Received request');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  if (!verifyHmac(event)) {
    console.error('[appointments-auto-remove] HMAC verification failed');
    return { statusCode: 401, body: 'Invalid HMAC' };
  }
  console.log('[appointments-auto-remove] HMAC verified OK');

  let order;
  try {
    order = JSON.parse(event.body || '{}');
  } catch (e) {
    console.error('[appointments-auto-remove] Failed to parse order JSON:', e.message);
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const orderId = order.id;
  const orderName = order.name || `#${orderId}`;
  const topic = event.headers['x-shopify-topic'] || event.headers['X-Shopify-Topic'] || 'unknown';
  console.log(`[appointments-auto-remove] Processing order ${orderName} (id: ${orderId}), topic: ${topic}`);

  const note = order.note || '';
  console.log(`[appointments-auto-remove] Order note: ${note}`);

  const locationCode = extractFromNote(note, 'locationCode');
  const carrierCode = extractFromNote(note, 'carrierCode');
  const claimNumber = extractFromNote(note, 'claimNumber');

  console.log('[appointments-auto-remove] Extracted from note:', { locationCode, carrierCode, claimNumber });

  if (!locationCode || !carrierCode || !claimNumber) {
    console.warn('[appointments-auto-remove] No SKQ appointment data found in order note — skipping');
    return {
      statusCode: 200,
      body: JSON.stringify({ status: 'skipped', reason: 'no_appointment_in_note' })
    };
  }

  let token;
  try {
    token = await getAccessToken();
    console.log('[appointments-auto-remove] OAuth token obtained');
  } catch (err) {
    console.error('[appointments-auto-remove] Failed to get OAuth token:', err.message);
    await appendOrderNote(orderId, `[SKQ ERROR] Failed to cancel appointment — OAuth error: ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'auth_failed' }) };
  }

  const skqUrl = `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`;
  console.log(`[appointments-auto-remove] Calling SKQ API: DELETE ${skqUrl}`);

  let skqRes;
  let skqText;
  try {
    skqRes = await fetch(skqUrl, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    skqText = await skqRes.text();
    console.log(`[appointments-auto-remove] SKQ response status: ${skqRes.status}`);
    console.log(`[appointments-auto-remove] SKQ response body: ${skqText}`);
  } catch (err) {
    console.error('[appointments-auto-remove] SKQ fetch failed:', err.message);
    await appendOrderNote(orderId, `[SKQ ERROR] Network error cancelling appointment: ${err.message}`);
    return { statusCode: 500, body: JSON.stringify({ status: 'error', reason: 'skq_network_error' }) };
  }

  const resultNote = [
    skqRes.ok
      ? `[SKQ] Appointment cancelled successfully (trigger: ${topic})`
      : `[SKQ ERROR] Appointment cancellation failed (HTTP ${skqRes.status}, trigger: ${topic})`,
    `locationCode: ${locationCode}`,
    `carrierCode: ${carrierCode}`,
    `claimNumber: ${claimNumber}`,
    `SKQ response: ${skqText}`,
    `cancelledAt: ${new Date().toISOString()}`
  ].join('\n');

  await appendOrderNote(orderId, resultNote);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: skqRes.ok ? 'appointment_cancelled' : 'skq_error',
      skqStatus: skqRes.status,
      skqResponse: skqText
    })
  };
};
