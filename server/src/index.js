import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import userRoutes from "./routes/user.route.js";
import chatRoutes from "./routes/chat.route.js"; // 👈 Import the new chat routes

const app = express();
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Hello World");
});
connectDB();

// Mount the authentication routes
app.use("/api/auth", authRoutes);
// Mount the user routes
app.use("/api/users", userRoutes);
// 👈 Mount the new chat routes
app.use("/api/chats", chatRoutes);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log("Server listening on port 3000");
});
