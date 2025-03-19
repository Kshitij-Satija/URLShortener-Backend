const express = require("express");
const router = express.Router();
const Url = require("../models/Url");

// Create a new shortened URL
router.post("/shorten", async (req, res) => {
  const { originalUrl, customCode } = req.body;

  try {
    const existingUrl = await Url.findOne({ shortCode: customCode });
    if (customCode && existingUrl) {
      return res.status(400).json({ error: "Custom code is already in use." });
    }

    const shortCode = customCode || Math.random().toString(36).substring(2, 8);
    const newUrl = new Url({ originalUrl, shortCode });
    await newUrl.save();

    res.json({ shortUrl: `http://localhost:5000/${shortCode}` });
  } catch (error) {
    console.error("Error creating URL:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});


// Helper to extract client info
const getClientInfo = (req) => ({
  ipAddress: req.headers["x-forwarded-for"] || req.socket.remoteAddress,
  userAgent: req.headers["user-agent"],
  referrer: req.headers.referer || "Direct",
});

// Redirect with Analytics
router.get("/:shortCode", async (req, res) => {
  try {
    const url = await Url.findOne({ shortCode: req.params.shortCode });
    if (!url) return res.status(404).send("URL not found.");

    // Collect analytics
    const analyticsData = getClientInfo(req);
    url.clicks += 1; // Increment clicks
    url.analytics.push(analyticsData);
    await url.save();

    console.log("Analytics Logged:", analyticsData);

    res.redirect(url.originalUrl);
  } catch (error) {
    console.error("Redirect Error:", error);
    res.status(500).send("Internal Server Error");
  }
});


// Fetch Analytics by Short Code
router.post("/analytics", async (req, res) => {
  try {
    const { shortCode } = req.body;

    if (!shortCode) {
      return res.status(400).json({ error: "Short code is required" });
    }

    const url = await Url.findOne({ shortCode });

    if (!url) {
      return res.status(404).json({ error: "URL not found" });
    }

    res.json({
      originalUrl: url.originalUrl,
      totalClicks: url.clicks,
      analytics: url.analytics,
    });
  } catch (error) {
    console.error("Analytics Fetch Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

module.exports = router;
