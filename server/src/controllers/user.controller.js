import User from "../models/User.js";

/**
 * Searches for users by username or email.
 * This function is protected and can only be accessed by authenticated users.
 */
export const searchUsers = async (req, res) => {
  // The search term comes from a URL query parameter (e.g., /api/users/search?q=testuser)
  const query = req.query.q;

  if (!query) {
    return res.status(400).json({ message: "A search query is required" });
  }

  try {
    // req.userId is attached to the request by the verifyJWT middleware
    const currentUserId = req.userId;

    // Use a regular expression for a case-insensitive search
    const searchRegex = new RegExp(query, "i");

    // Find users who match the search query but are NOT the current user
    const users = await User.find({
      _id: { $ne: currentUserId }, // Exclude the current user from results
      $or: [
        { username: { $regex: searchRegex } },
        { email: { $regex: searchRegex } },
      ],
    })
      .limit(10) // Limit results to 10 to prevent abuse
      .select("-password -refreshToken") // Exclude sensitive fields from the response
      .exec();

    res.status(200).json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getMyProfile = async (req, res) => {
  try {
    // req.userId is attached by the verifyJWT middleware.
    // We find the user by their ID and exclude sensitive fields.
    const user = await User.findById(req.userId)
      .select("-password -refreshToken")
      .exec();

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
};
