import User from "../models/User.js";
import bcrypt from "bcrypt";

// Escape regex special chars to build safe patterns
const escapeRegex = (s = "") => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * GET /api/users/search?q=term&limit=20&page=1
 * Auth required.
 */
export const searchUsers = async (req, res) => {
  const { q = "", limit = 20, page = 1 } = req.query;
  const term = String(q).trim();

  if (!term)
    return res.status(400).json({ message: "A search query is required" });

  try {
    const currentUserId = req.userId;
    const perPage = Math.min(parseInt(limit, 10) || 20, 50);
    const pageNum = Math.max(parseInt(page, 10) || 1, 1);
    const skip = (pageNum - 1) * perPage;

    const rx = new RegExp(escapeRegex(term), "i");

    const filter = {
      _id: { $ne: currentUserId },
      $or: [{ username: rx }, { email: rx }],
    };

    const projection = "_id username publicKey email"; // include only safe fields

    const [items, total] = await Promise.all([
      User.find(filter)
        .select(projection)
        .sort({ username: 1 })
        .skip(skip)
        .limit(perPage)
        .lean(),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      items,
      page: pageNum,
      limit: perPage,
      total,
      hasMore: skip + items.length < total,
    });
  } catch (err) {
    console.error("searchUsers error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * GET /api/users/me
 * Auth required.
 */
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.userId)
      .select("_id username email publicKey avatarUrl createdAt updatedAt")
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  const { username } = req.body;
  if (!username) {
    return res.status(400).json({ message: "username is required" });
  }
  try {
    const user = await User.findById(req.userId).exec();
    if (!user) {
      console.log("user not found");
      return res.sendStatus(404);
    }
    user.username = username;
    await user.save();

    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.refreshToken;

    return res.status(200).json(userToReturn);
  } catch (err) {
    console.error("updateUserProfile error:", err);
    if (err.code === 11000) {
      return res.status(409).json({ message: "username is already taken" });
    }
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserPassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "missing password fields" });
  }

  try {
    const user = await User.findById(req.userId).select("+password").exec();
    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Incorrect current password" });
    }
    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    user.password = newPasswordHash;
    await user.save();

    const userToReturn = user.toObject();
    delete userToReturn.password;
    delete userToReturn.refreshToken;

    return res.status(200).json(userToReturn);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserAvatar = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "No image file was uploaded." });
  }

  try {
    // Construct the relative path
    const relativePath = `/uploads/avatars/${req.file.filename}`;

    // ✅ Construct the full URL using the request protocol and host
    const fullAvatarUrl = `${req.protocol}://${req.get("host")}${relativePath}`;

    // Find the user and update their avatarUrl with the full URL
    const user = await User.findByIdAndUpdate(
      req.userId,
      { avatarUrl: fullAvatarUrl },
      { new: true } // Return the updated document
    ).select("-password -refreshToken");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error("Error updating avatar:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
