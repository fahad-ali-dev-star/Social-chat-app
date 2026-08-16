import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import cookieParser from "cookie-parser";
import compression from "compression";
import helmet from "helmet";
import { createServer } from "http";
import { Server } from "socket.io";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "node:url";
import jwt from "jsonwebtoken";
import Conversation from "./models/Conversation.js";
import { notFound, errorHandler } from "./middleware/errorHandler.js";
import { connectDB } from "./config/db.js";
import { redisClient, redisSubscriber } from "./config/redis.js";
import authRoutes from "./routes/authRoutes.js";
import postRoutes from "./routes/postRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import notificationRoutes from "./routes/notificationRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import messageRoutes from "./routes/messageRoutes.js";
import storyRoutes from "./routes/storyRoutes.js";
import reportRoutes from "./routes/reportRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, ".env.local") });
connectDB();

const app = express();
const httpServer = createServer(app);

// ─── Compression (gzip all responses) ───────────────────────────────────────
app.use(compression());

// ─── Security headers via Helmet ────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // managed per-route if needed
    crossOriginEmbedderPolicy: false,
  })
);

// ─── Socket.IO ───────────────────────────────────────────────────────────────
const io = new Server(httpServer, {
  cors: { origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true },
  pingTimeout: 60000,
  pingInterval: 25000,
  transports: ["websocket", "polling"],
});

// Attach Redis adapter for horizontal scaling if Redis is available
if (redisClient && redisSubscriber) {
  import("@socket.io/redis-adapter").then(({ createAdapter }) => {
    io.adapter(createAdapter(redisClient, redisSubscriber));
    console.log("Socket.IO using Redis adapter for horizontal scaling");
  }).catch((e) => console.warn("Redis adapter not available:", e.message));
}

// ─── JWT cookie helper ───────────────────────────────────────────────────────
const getCookieValue = (cookieHeader, name) => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
};

io.use((socket, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return next(new Error("Server authentication is not configured"));
    }
    const token = getCookieValue(socket.handshake.headers.cookie, "token") || socket.handshake.auth?.token;
    if (!token) return next(new Error("Not authenticated"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded?.id) return next(new Error("Invalid authentication token"));
    socket.userId = String(decoded.id);
    next();
  } catch {
    next(new Error("Not authenticated"));
  }
});

// ─── CORS + Body parsers ─────────────────────────────────────────────────────
const allowedOrigin = process.env.CLIENT_URL || "http://localhost:5173";
app.disable("x-powered-by");
app.set("trust proxy", process.env.NODE_ENV === "production" ? 1 : 0);

app.use(cors({ origin: allowedOrigin, credentials: true, methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: "1mb", strict: true }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));
app.use(cookieParser());
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ─── Rate Limiting (in-memory; Redis rate-limit store can be added when rate-limit-redis >= 8.6.0 is available) ─────
const apiLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false });
const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false, message: { message: "Too many authentication attempts. Try again later." } });
const uploadLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

app.use("/api", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);
app.use("/api/upload", uploadLimiter);

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/upload", uploadRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/reports", reportRoutes);
app.use("/api/admin", adminRoutes);

app.get("/api/health", (req, res) => res.json({
  status: "ok",
  uptime: Math.round(process.uptime()),
  redis: redisClient ? "connected" : "not configured",
}));

app.use(notFound);
app.use(errorHandler);

// ─── Realtime — online status + typing + notifications ───────────────────────
const onlineUsers = new Map(); // socketId -> userId (local to this process)

io.on("connection", (socket) => {
  const userId = socket.userId;
  socket.join(userId);
  onlineUsers.set(socket.id, userId);
  io.emit("online_users", Array.from(new Set(onlineUsers.values())));

  socket.on("join_conversation", async (conversationId) => {
    try {
      if (!conversationId) return;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).select("_id");
      if (conversation) socket.join(`conv_${conversationId}`);
    } catch {
      // Ignore malformed/unauthorized room joins.
    }
  });

  socket.on("leave_conversation", (conversationId) => {
    if (conversationId) socket.leave(`conv_${conversationId}`);
  });

  socket.on("typing", async ({ conversationId, isTyping }) => {
    try {
      if (!conversationId) return;
      const conversation = await Conversation.findOne({
        _id: conversationId,
        participants: userId,
      }).select("_id");
      if (!conversation) return;
      socket.to(`conv_${conversationId}`).emit("user_typing", {
        conversationId,
        userId,
        isTyping: Boolean(isTyping),
      });
    } catch {
      // Ignore malformed/unauthorized typing events.
    }
  });

  socket.on("disconnect", () => {
    onlineUsers.delete(socket.id);
    io.emit("online_users", Array.from(new Set(onlineUsers.values())));
  });
});

app.set("io", io);

// ─── Graceful Shutdown ────────────────────────────────────────────────────────
const shutdown = async (signal) => {
  console.log(`\n${signal} received — shutting down gracefully...`);
  httpServer.close(async () => {
    console.log("HTTP server closed");
    try {
      const mongoose = await import("mongoose");
      await mongoose.default.connection.close();
      console.log("MongoDB connection closed");
    } catch {}
    if (redisClient) {
      redisClient.disconnect();
      console.log("Redis disconnected");
    }
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000); // force exit after 10s
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));
