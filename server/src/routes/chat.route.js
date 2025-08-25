import express from "express";
// Make sure to import getChatRooms
import {
  createChatRoom,
  getChatRooms,
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";

const router = express.Router();

// Route to create a new chat room (already exists)
router.post("/", verifyJWT, createChatRoom);

// Route to get all of the user's chat rooms (new)
router.get("/", verifyJWT, getChatRooms);

export default router;
