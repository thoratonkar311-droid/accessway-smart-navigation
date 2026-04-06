/**
 * AccessWay – Smart Accessible Navigation System
 * Main server entry point
 */

const express = require("express");
const http = require("http");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const { Server } = require("socket.io");
const path = require("path");
require("dotenv").config();

const authRoutes      = require("./routes/auth");
const reportRoutes    = require("./routes/reports");
const routeRoutes     = require("./routes/routes");
const userRoutes      = require("./routes/users");
const aiRoutes        = require("./routes/ai");
const { initSocket }  = require("./utils/socket");
const { errorHandler } = require("./middleware/errorHandler");

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:3000", methods: ["GET", "POST"] }
});

// ── Security & Logging ────────────────────────────────────
app.use(helmet());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

// ── Rate Limiting ─────────────────────────────────────────
const limiter = rateLimit({
  windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000,
  max: process.env.RATE_LIMIT_MAX || 100,
  message: { error: "Too many requests. Please slow down." }
});
app.use("/api/", limiter);

// ── CORS ──────────────────────────────────────────────────
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:3000",
  credentials: true
}));

// ── Body Parsers ──────────────────────────────────────────
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// ── Static Uploads ────────────────────────────────────────
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// ── Socket.io ─────────────────────────────────────────────
initSocket(io);
app.set("io", io);

// ── API Routes ────────────────────────────────────────────
app.use("/api/auth",    authRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/routes",  routeRoutes);
app.use("/api/users",   userRoutes);
app.use("/api/ai",      aiRoutes);

// ── Health Check ──────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime(), timestamp: new Date() });
});

// ── Serve React Frontend in production ────────────────────
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/build")));
  app.get("*", (req, res) =>
    res.sendFile(path.join(__dirname, "../frontend/build/index.html"))
  );
}

// ── Error Handler ─────────────────────────────────────────
app.use(errorHandler);

// ── Database + Start ─────────────────────────────────────
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () =>
      console.log(`🚀 AccessWay server running on port ${PORT} [${process.env.NODE_ENV}]`)
    );
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

module.exports = { app, server };
