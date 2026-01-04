const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later."
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));
app.use(express.raw({ 
  limit: '50mb',
  type: 'application/octet-stream'
}));
app.use(limiter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "speedtest-backend"
  });
});

// 🔹 Ping Test
app.get("/ping", (req, res) => {
  res.json({ 
    message: "pong", 
    timestamp: Date.now(),
    serverTime: new Date().toISOString()
  });
});

// 🔹 Download Test (Configurable size)
app.get("/download", (req, res) => {
  const size = parseInt(req.query.size) || 10; // MB, default 10MB
  const bufferSize = size * 1024 * 1024;
  
  // Validate size (max 50MB)
  if (size > 50) {
    return res.status(400).json({ error: "Maximum download size is 50MB" });
  }
  
  const buffer = Buffer.alloc(bufferSize, Math.random().toString(36).substring(2));
  
  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": bufferSize,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff"
  });
  
  res.send(buffer);
});

// 🔹 Upload Test
app.post("/upload", (req, res) => {
  try {
    const receivedBytes = req.body.length;
    const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(2);
    
    res.json({ 
      status: "success", 
      receivedBytes: receivedBytes,
      receivedMB: receivedMB,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload processing failed" });
  }
});

// 🔹 Get server info
app.get("/info", (req, res) => {
  res.json({
    name: "SpeedTest Backend",
    version: "2.0.0",
    endpoints: ["/ping", "/download", "/upload", "/health", "/info"],
    maxDownloadSize: "50MB",
    maxUploadSize: "50MB"
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    error: "Something went wrong!",
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Endpoint not found" });
});

// 🔹 Start Server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Speed Test Backend Running
📍 Port: ${PORT}
📅 Started: ${new Date().toISOString()}
📊 Endpoints:
   • GET  /ping      - Latency test
   • GET  /download  - Download test
   • POST /upload    - Upload test
   • GET  /health    - Health check
   • GET  /info      - Server info
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
  });
});

module.exports = app;