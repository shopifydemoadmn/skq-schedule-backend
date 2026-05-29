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
  let zip;
  try {
    zip = JSON.parse(event.body || '{}').zip;
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

  if (!zip) {
    return {
      statusCode: 400,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "ZIP is required" })
    };
  }

  try {
    // --- Get OAuth token ---
    const token = await getAccessToken();

    // --- Call SKQ API ---
    const res = await fetch(`${SKQ_API_BASE_URL}/Locations`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await res.text();
    console.log("SKQ RAW:", text);

    let locations = [];
    try {
      locations = JSON.parse(text);
      if (!Array.isArray(locations)) locations = [];
    } catch {
      console.error("SKQ returned non-JSON");
      locations = [];
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify(locations)
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
