import express from "express";
import { createChatRoom } from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const router = express.Router();

// This route is protected. Only an authenticated user can create a chat room.
router.post("/", verifyJWT, createChatRoom);

export default router;
