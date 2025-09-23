import User from "../models/User.js";

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
      .select("_id username email publicKey createdAt updatedAt") // explicit safe projection
      .lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json(user);
  } catch (err) {
    console.error("getMyProfile error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};
