import express from "express";
import {
  createChatRoom,
  getChatRooms,
  getChatMessages,
  markChatAsRead,
  handleFileUpload, // ✅ ADDED handleFileUpload
} from "../controllers/chat.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js";
import { uploadMessageFiles } from "../middlewares/multer.middleware.js";
import { multerErrorHandler } from "../middlewares/errorHandler.middleware.js";

const router = express.Router();

// Route to create a new chat room (already exists)
router.post("/", verifyJWT, createChatRoom);

// Route to get all of the user's chat rooms (already exists)
router.get("/", verifyJWT, getChatRooms);

// NEW: Route to get all messages for a specific chat room
router.get("/:chatroomId/messages", verifyJWT, getChatMessages);

router.post(
  "/:chatroomId/files",
  verifyJWT,
  uploadMessageFiles,
  handleFileUpload, // ✅ FIX: Insert the file handler here!
  multerErrorHandler
);

router.put("/:chatroomId/read", verifyJWT, markChatAsRead);

export default router;
