const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const zlib = require("zlib");

const app = express();

// Rate limiting - increased for speed tests
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Increased for speed tests (each test makes multiple requests)
  message: "Too many requests from this IP, please try again later."
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'HEAD', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Content-Length', 'Cache-Control']
}));
app.use(express.raw({ 
  limit: '100mb', // Increased limit
  type: 'application/octet-stream'
}));

// Apply rate limiting to specific routes
app.use('/download', limiter);
app.use('/upload', limiter);

// Helper function to generate random binary data (not text!)
function generateRandomBuffer(sizeInBytes) {
  const buffer = Buffer.alloc(sizeInBytes);
  
  // Fill with actual random bytes (not text)
  for (let i = 0; i < sizeInBytes; i += 4) {
    // Write random 32-bit integers for better randomness
    buffer.writeUInt32LE(Math.floor(Math.random() * 0xFFFFFFFF), i);
  }
  
  return buffer;
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: "healthy", 
    timestamp: new Date().toISOString(),
    service: "speedtest-backend",
    version: "2.1.0"
  });
});

// 🔹 Ping Test (optimized)
app.get("/ping", (req, res) => {
  // Minimal response for ping
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.json({ 
    message: "pong", 
    timestamp: Date.now(),
    serverTime: new Date().toISOString()
  });
});

// 🔹 HEAD request for ping (even faster)
app.head("/ping", (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('Content-Type', 'application/json');
  res.end();
});

// 🔹 Download Test (IMPROVED - uses chunked transfer for accurate measurement)
app.get("/download", (req, res) => {
  const size = parseInt(req.query.size) || 10; // MB, default 10MB
  const chunkSize = parseInt(req.query.chunk) || 1024 * 1024; // 1MB chunks by default
  const bufferSize = size * 1024 * 1024;
  
  // Validate size (max 100MB)
  if (size > 100) {
    return res.status(400).json({ error: "Maximum download size is 100MB" });
  }
  
  if (size < 1) {
    return res.status(400).json({ error: "Minimum download size is 1MB" });
  }
  
  // Set headers
  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": bufferSize,
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "X-Content-Type-Options": "nosniff",
    "Connection": "keep-alive",
    "Accept-Ranges": "none"
  });
  
  // Send data in chunks for more accurate speed measurement
  let sentBytes = 0;
  const chunkCount = Math.ceil(bufferSize / chunkSize);
  
  function sendChunk(chunkIndex) {
    if (chunkIndex >= chunkCount) {
      res.end();
      return;
    }
    
    const remainingBytes = bufferSize - sentBytes;
    const currentChunkSize = Math.min(chunkSize, remainingBytes);
    
    // Generate random data for this chunk (not repetitive text!)
    const chunkBuffer = generateRandomBuffer(currentChunkSize);
    
    res.write(chunkBuffer, (err) => {
      if (err) {
        console.error('Write error:', err);
        return;
      }
      
      sentBytes += currentChunkSize;
      
      // Schedule next chunk with minimal delay
      if (chunkIndex < chunkCount - 1) {
        // Use setImmediate for better flow control
        setImmediate(() => sendChunk(chunkIndex + 1));
      } else {
        res.end();
      }
    });
  }
  
  // Start sending chunks
  sendChunk(0);
});

// 🔹 Upload Test (optimized)
app.post("/upload", (req, res) => {
  try {
    const startTime = Date.now();
    const receivedBytes = req.body.length;
    const receivedMB = (receivedBytes / (1024 * 1024)).toFixed(2);
    const endTime = Date.now();
    const processTime = endTime - startTime;
    
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0"
    });
    
    res.json({ 
      status: "success", 
      receivedBytes: receivedBytes,
      receivedMB: receivedMB,
      processTimeMs: processTime,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      error: "Upload processing failed",
      message: error.message 
    });
  }
});

// 🔹 New endpoint for progressive download (better for speed tests)
app.get("/download-progressive", (req, res) => {
  const duration = parseInt(req.query.duration) || 5000; // Test duration in ms
  const chunkSize = 1024 * 1024; // 1MB chunks
  const startTime = Date.now();
  
  res.set({
    "Content-Type": "application/octet-stream",
    "Cache-Control": "no-store, no-cache, must-revalidate",
    "Pragma": "no-cache",
    "Expires": "0",
    "Transfer-Encoding": "chunked"
  });
  
  function sendNextChunk() {
    if (Date.now() - startTime >= duration) {
      res.end();
      return;
    }
    
    const chunkBuffer = generateRandomBuffer(chunkSize);
    res.write(chunkBuffer, (err) => {
      if (err) {
        console.error('Write error:', err);
        return;
      }
      
      // Use setImmediate to avoid blocking event loop
      setImmediate(sendNextChunk);
    });
  }
  
  sendNextChunk();
});

// 🔹 Connection info endpoint
app.get("/connection-info", (req, res) => {
  const connection = req.socket;
  res.json({
    remoteAddress: connection.remoteAddress,
    remotePort: connection.remotePort,
    localAddress: connection.localAddress,
    localPort: connection.localPort,
    bytesRead: connection.bytesRead,
    bytesWritten: connection.bytesWritten,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("Server error:", err.stack);
  res.status(500).json({ 
    error: "Internal server error",
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: "Endpoint not found",
    path: req.path,
    method: req.method,
    timestamp: new Date().toISOString()
  });
});

// 🔹 Start Server with optimized settings
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`
🚀 Speed Test Backend Running
📍 Port: ${PORT}
📅 Started: ${new Date().toISOString()}
🔄 Optimized for accurate speed measurement
📊 Endpoints:
   • GET   /ping                 - Latency test
   • HEAD  /ping                 - Fast ping test
   • GET   /download             - Download test (configurable size)
   • GET   /download-progressive - Progressive download test
   • POST  /upload              - Upload test
   • GET   /health              - Health check
   • GET   /info               - Server info
   • GET   /connection-info    - Connection details
  `);
});

// Optimize server for speed tests
server.keepAliveTimeout = 30000; // 30 seconds
server.headersTimeout = 35000; // 35 seconds

// Graceful shutdown
const shutdown = () => {
  console.log('Shutdown signal received: closing HTTP server');
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
  
  // Force shutdown after 10 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

module.exports = app;