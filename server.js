const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");

const app = express();

// Rate limiting
const limiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes (reduced)
  max: 500, // Increased for speed tests
  skipSuccessfulRequests: true // Don't count successful requests
});

// Middleware - SIMPLIFIED
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'HEAD'],
  allowedHeaders: ['Content-Type']
}));

// For uploads - use express.json() for better compatibility
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ 
  limit: '50mb',
  type: 'application/octet-stream'
}));

// Apply rate limiting only to prevent abuse
app.use('/upload', limiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ 
    status: "ok",
    timestamp: Date.now()
  });
});

// Ping endpoint - MINIMAL RESPONSE
app.get("/ping", (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json'
  });
  res.json({ ping: "pong" });
});

// HEAD for ping (even smaller)
app.head("/ping", (req, res) => {
  res.set({
    'Cache-Control': 'no-store',
    'Content-Type': 'application/json'
  });
  res.end();
});

// Download endpoint - SIMPLIFIED
app.get("/download", (req, res) => {
  const size = parseInt(req.query.size) || 5; // Default 5MB
  const bufferSize = Math.min(size, 20) * 1024 * 1024; // Max 20MB
  
  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": bufferSize,
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Connection": "keep-alive"
  });
  
  // Create simple buffer (pattern is fine for speed tests)
  const buffer = Buffer.alloc(bufferSize, 'X'); // Simple pattern
  
  res.send(buffer);
});

// Upload endpoint - SIMPLIFIED
app.post("/upload", (req, res) => {
  try {
    const body = req.body;
    const size = body.length || (req.headers['content-length'] ? parseInt(req.headers['content-length']) : 0);
    
    res.set({
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json'
    });
    
    res.json({
      success: true,
      size: size,
      received: size > 0
    });
    
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ error: "Upload failed" });
  }
});

// Server info
app.get("/", (req, res) => {
  res.json({
    service: "SpeedTest Backend",
    endpoints: {
      ping: "GET /ping",
      download: "GET /download?size=5 (size in MB, max 20)",
      upload: "POST /upload",
      health: "GET /health"
    }
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 SpeedTest Backend running on port ${PORT}`);
});