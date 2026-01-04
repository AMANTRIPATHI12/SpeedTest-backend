const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json({ limit: "50mb" }));

// 🔹 Ping Test
app.get("/ping", (req, res) => {
  res.json({ message: "pong", time: Date.now() });
});

// 🔹 Download Test (10MB data)
app.get("/download", (req, res) => {
  const size = 10 * 1024 * 1024; // 10 MB
  const buffer = Buffer.alloc(size, "a");

  res.set({
    "Content-Type": "application/octet-stream",
    "Content-Length": size,
    "Cache-Control": "no-store"
  });

  res.send(buffer);
});

// 🔹 Upload Test
app.post("/upload", (req, res) => {
  res.json({ status: "uploaded", receivedBytes: JSON.stringify(req.body).length });
});

// 🔹 Health Check
app.get("/", (req, res) => {
  res.send("Speed Test Backend Running 🚀");
});

// 🔹 Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
