const { getAccessToken } = require("./skqAuth");
const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;

exports.handler = async (event) => {

  console.log("ENV SKQ:", SKQ_API_BASE_URL);

  // --- OPTIONS (preflight) ---
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: ""
    };
  }

  // --- Only POST allowed ---
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: "Method Not Allowed"
    };
  }

  // --- Parse body ---
  let locationCode;
  try {
    locationCode = JSON.parse(event.body || '{}').locationCode;
  } catch (e) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "Invalid JSON" })
    };
  }

  if (!locationCode) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "locationCode is required" })
    };
  }

  try {
    // --- Get OAuth token ---
    const token = await getAccessToken();

    // --- Call SKQ API ---
    const res = await fetch(`${SKQ_API_BASE_URL}/TimeSlots/${locationCode}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await res.text();
    console.log("SKQ TIMESLOTS RAW:", text);

    let timeslots = [];
    try {
      timeslots = JSON.parse(text);
      if (!Array.isArray(timeslots)) timeslots = [];
    } catch {
      console.error("SKQ returned non-JSON for timeslots");
      timeslots = [];
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify(timeslots)
    };

  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify([])
    };
  }
};
