import express from "express";
import http from "http";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser"; // Import cookie-parser

import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js";
import { initializeSocketServer } from "./socket/sockethandler.js"; // 👈 Import the new handler

dotenv.config();

const app = express();
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Middlewares
app.use(express.json());
app.use(cookieParser()); // 👈 Use cookie-parser to handle cookies
app.use(express.static("public"));

const PORT = 3000;

// --- Database and API Routes ---
connectDB();
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/chats", chatRoutes);

const server = http.createServer(app);

// --- Initialize Socket.IO Server ---
initializeSocketServer(server); // 👈 Initialize and attach the socket server

server.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
});
