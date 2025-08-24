import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import nacl from "tweetnacl";
import connectDB from "./config/db.js";
import authRoutes from "./routes/auth.route.js";
import cookieParser from "cookie-parser";
import userRoutes from "./routes/user.route.js";

const app = express();
app.use(express.json());
const PORT = 3000;
app.use(cookieParser());

app.use(
  cors({
    origin: "http://localhost:5173", // allow frontend origin
    credentials: true, // allow cookies/auth headers if needed
  })
);

app.get("/", (req, res) => {
  res.send("Hello World");
});
connectDB();

app.use("/api/auth", authRoutes);

app.use("/api/users", userRoutes);

const server = http.createServer(app);

server.listen(PORT, () => {
  console.log("Server listening on port 3000");
});
