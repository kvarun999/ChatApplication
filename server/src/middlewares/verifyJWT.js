import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const verifyJWT = (req, res, next) => {
  // Use req.headers.authorization for convention
  const authHeader = req.headers.authorization || req.headers.Authorization;

  // Check if the header exists and is in the correct format
  if (!authHeader?.startsWith("Bearer ")) {
    return res.sendStatus(401); // Unauthorized
  }

  const accessToken = authHeader.split(" ")[1];

  jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      // This handles expired or invalid tokens
      return res.sendStatus(403); // Forbidden
    }
    // Attach the user's ID to the request object for later use
    req.userId = decoded.userId;

    // ✅ CRITICAL: Call next() to pass control to the next handler
    next();
  });
};
