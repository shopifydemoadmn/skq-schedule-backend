const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;

exports.handler = async (event) => {

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
    // --- Correct SKQ endpoint: GET /Locations ---
    const res = await fetch(`${SKQ_API_BASE_URL}/Locations`, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      const text = await res.text();
      console.error("SKQ error:", text);
      return {
        statusCode: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Headers": "Content-Type",
          "Access-Control-Allow-Methods": "POST, OPTIONS"
        },
        body: JSON.stringify({ error: "SKQ API error", details: text })
      };
    }

    const locations = await res.json();

    // --- Filter by ZIP ---
    const filtered = locations.filter(loc => loc.zipCode === zip);

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify(filtered)
    };

  } catch (err) {
    console.error("Function error:", err);
    return {
      statusCode: 500,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify({ error: "Server error", details: err.message })
    };
  }
};
