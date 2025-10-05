import express from "express";
import {
  getMyProfile,
  searchUsers,
  updateUserAvatar,
  updateUserPassword,
  updateUserProfile,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/verifyJWT.js"; // 👈 Import your middleware
import { uploadAvatar } from "../middlewares/multer.middleware.js";

const router = express.Router();

// Apply the verifyJWT middleware to this route.
// This ensures that only logged-in users can search for other users.
router.get("/search", verifyJWT, searchUsers);

//Get the current user's profile
router.get("/me", verifyJWT, getMyProfile);

//upate username
router.put("/me", verifyJWT, updateUserProfile);

router.put("/me/password", verifyJWT, updateUserPassword);

router.put("/me/avatar", verifyJWT, uploadAvatar, updateUserAvatar);

export default router;
