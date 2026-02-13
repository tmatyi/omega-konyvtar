const functions = require("firebase-functions");
const fetch = require("node-fetch");

exports.corsProxy = functions.https.onRequest(async (req, res) => {
  // Set CORS headers
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.set("Access-Control-Allow-Headers", "Content-Type");

  // Handle preflight
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const targetUrl = req.query.url;
  if (!targetUrl) {
    res.status(400).json({ error: "Missing 'url' query parameter" });
    return;
  }

  // Only allow specific domains for security
  const allowedDomains = [
    "www.clchungary.com",
    "clchungary.com",
    "bookline.hu",
    "www.bookline.hu",
    "moly.hu",
    "www.moly.hu",
  ];

  let parsedUrl;
  try {
    parsedUrl = new URL(targetUrl);
  } catch (e) {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  if (!allowedDomains.includes(parsedUrl.hostname)) {
    res.status(403).json({ error: "Domain not allowed" });
    return;
  }

  try {
    const response = await fetch(targetUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "hu-HU,hu;q=0.9,en-US;q=0.8,en;q=0.7",
      },
      timeout: 15000,
    });

    if (!response.ok) {
      res
        .status(response.status)
        .json({ error: `Upstream returned ${response.status}` });
      return;
    }

    const html = await response.text();
    res.set("Content-Type", "text/html; charset=utf-8");
    res.status(200).send(html);
  } catch (error) {
    console.error("Proxy fetch error:", error.message);
    res.status(502).json({ error: "Failed to fetch target URL" });
  }
});
