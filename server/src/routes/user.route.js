import express from "express";
import { getMyProfile, searchUsers } from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js"; // 👈 Import your middleware

const router = express.Router();

// Apply the verifyJWT middleware to this route.
// This ensures that only logged-in users can search for other users.
router.get("/search", verifyJWT, searchUsers);

//Get the current user's profile
router.get("/me", verifyJWT, getMyProfile);

export default router;
