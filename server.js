const express = require("express");
const cors = require("cors");

const app = express();

// Middleware - minimal
app.use(cors());
app.use(express.raw({ 
  limit: '10mb', // Smaller limit for reliability
  type: 'application/octet-stream'
}));

// 🔹 Quick ping endpoint
app.get("/ping", (req, res) => {
  res.json({ pong: Date.now() });
});

// 🔹 Quick download (SMALL SIZE)
app.get("/download", (req, res) => {
  const size = 2 * 1024 * 1024; // 2MB only - FAST
  const buffer = Buffer.alloc(size, 'A'); // Simple data
  
  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": size,
    "Cache-Control": "no-store"
  });
  
  res.send(buffer);
});

// 🔹 Quick upload (SMALL SIZE)
app.post("/upload", (req, res) => {
  // Just acknowledge receipt - no processing
  res.json({ 
    ok: true,
    received: req.body?.length || 0
  });
});

// 🔹 Health check
app.get("/health", (req, res) => {
  res.json({ status: "ready" });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ SpeedTest Backend ready on port ${PORT}`);
});