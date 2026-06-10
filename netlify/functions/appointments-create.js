const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;
const SKQ_CLIENT_ID = process.env.SKQ_CLIENT_ID;
const SKQ_CLIENT_SECRET = process.env.SKQ_CLIENT_SECRET;
const SHOPIFY_ACCESS_TOKEN = process.env.SHOPIFY_ACCESS_TOKEN;

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  const order = JSON.parse(event.body || "{}");

  const line = order.line_items?.[0] || {};
  const props = line.properties || {};

  const locationCode = props.locationCode;
  const carrierCode = props.carrierCode;
  const claimNumber = props.claimNumber;
  const appointmentDateTime = props.timeslotStart;

  const firstName = order.customer?.first_name || "";
  const lastName = order.customer?.last_name || "";
  const phoneNumber = order.customer?.phone || "";
  const email = order.email || "";

  const zipCode = order.shipping_address?.zip || "";
  const address = order.shipping_address?.address1 || "";
  const city = order.shipping_address?.city || "";
  const state = order.shipping_address?.province_code || "";

  const body = {
    firstName,
    lastName,
    phoneNumber,
    email,
    commPreference: "Phone",
    vehicleYear: 2020,
    vehicleMake: "Unknown",
    vehicleModel: "Unknown",
    zipCode,
    address,
    city,
    state,
    appointmentDateTime,
    appointmentType: "Drop-off",
    sendConfirmations: true,
    rentalRequested: false,
    datasourceId: 1
  };

  const token = await getAccessToken();

  const url = `${SKQ_API_BASE_URL}/Appointments/${locationCode}/${carrierCode}/${claimNumber}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  const text = await response.text();

  // Try to parse SKQ response
  let skq = {};
  try { skq = JSON.parse(text); } catch {}

  // Write note to Shopify order
  await writeOrderNote(order.id, `
SKQ Appointment created:
locationCode: ${locationCode}
carrierCode: ${carrierCode}
claimNumber: ${claimNumber}
scheduleId: ${skq.scheduleId || 0}
workfileId: ${skq.workfileId || 0}
  `);

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: "appointment_created",
      skqResponse: skq
    })
  };
};

async function getAccessToken() {
  const res = await fetch(`${SKQ_API_BASE_URL}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=client_credentials&client_id=${SKQ_CLIENT_ID}&client_secret=${SKQ_CLIENT_SECRET}`
  });

  const json = await res.json();
  return json.access_token;
}

async function writeOrderNote(orderId, note) {
  await fetch(`https://your-shop.myshopify.com/admin/api/2024-01/orders/${orderId}.json`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Access-Token": SHOPIFY_ACCESS_TOKEN
    },
    body: JSON.stringify({ order: { id: orderId, note } })
  });
}
