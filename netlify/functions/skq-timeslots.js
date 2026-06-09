const { getAccessToken } = require("./skqAuth");
const SKQ_API_BASE_URL = process.env.SKQ_API_BASE_URL;

exports.handler = async (event) => {
  console.log("ENV SKQ:", SKQ_API_BASE_URL);

  // --- OPTIONS ---
  if (event.httpMethod === "OPTIONS") {
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

  if (event.httpMethod !== "POST") {
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
  let body;
  try {
    body = JSON.parse(event.body || "{}");
  } catch {
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

  const locationCode = body.locationCode;
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

  // --- Dynamic dates ---
  const today = new Date();
  const end = new Date();
  end.setDate(today.getDate() + 14);

  const format = (d) =>
    `${(d.getMonth() + 1).toString().padStart(2, "0")}/${d
      .getDate()
      .toString()
      .padStart(2, "0")}/${d.getFullYear()}`;

  const startTime = format(today);
  const endTime = format(end);

  console.log("DATES:", { startTime, endTime });

  try {
    const token = await getAccessToken();

    const url = `${SKQ_API_BASE_URL}/timeslots/${locationCode}` +
      `?appointmentType=Drop-off&carrierCode=9&startTime=${encodeURIComponent(startTime)}&endTime=${encodeURIComponent(endTime)}`;

    console.log("➡️ SKQ URL:", url);

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });

    const text = await res.text();
    console.log("⬅️ SKQ RAW:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = [];
    }

    return {
      statusCode: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      },
      body: JSON.stringify(data)
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
