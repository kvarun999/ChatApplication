import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import path from "path";
import { fileURLToPath } from "url";

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import { initializeSocketServer } from "./socket/socketHandler.js";

dotenv.config();

const app = express();
const PORT = 3000;

// --- Resolve current directory (for ES Modules) ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- Middleware Setup ---
app.use(
  cors({
    origin: "http://localhost:5173", // Frontend origin
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());

// --- Serve Static Files ---
app.use(express.static("public")); // General assets (avatars, etc.)

// ✅ Serve uploaded files (including encrypted message chunks)
app.use("/uploads", express.static(path.join(__dirname, "public/uploads")));

// --- Database & API Routes ---
connectDB();
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

// --- HTTP + Socket.IO Integration ---
const server = http.createServer(app);
initializeSocketServer(server); // Attach Socket.IO

// --- Start Server ---
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
