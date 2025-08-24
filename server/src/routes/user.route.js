import express from "express";
import { searchUsers } from "../controllers/user.controller.js";
import { verifyJWT } from "../middleware/verifyJWT.js"; // 👈 Import your middleware

const router = express.Router();

// Apply the verifyJWT middleware to this route.
// This ensures that only logged-in users can search for other users.
router.get("/search", verifyJWT, searchUsers);

export default router;
