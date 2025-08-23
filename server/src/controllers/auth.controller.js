import User from "../models/User.js";
import bcrypt from "bcrypt";
// No longer need 'generateKeyPairSync' as the client handles key generation
import dotenv from "dotenv";
import jwt, { decode } from "jsonwebtoken";
import mongoose from "mongoose";
import cookieParser from "cookie-parser";

dotenv.config();

/**
 * Handles new user registration securely.
 * Assumes the client generates the key pair and sends the public key.
 */
export const register = async (req, res) => {
  // The client MUST send its public key in the request body.
  const { username, email, password, publicKey } = req.body;

  if (!username || !email || !password || !publicKey) {
    return res.status(400).json({
      message: "Username, email, password, and public key are required",
    });
  }

  try {
    // Check if the username or email is already taken
    const duplicate = await User.findOne({
      $or: [{ email: email }, { username: username }],
    })
      .lean()
      .exec(); // .lean() makes the query faster as we only need to check for existence

    if (duplicate) {
      return res
        .status(409)
        .json({ message: "Username or email is already taken" });
    }

    // Hash the user's password for secure storage
    const hashPwd = await bcrypt.hash(password, 10);

    // Create a new user ID ahead of time to use in JWTs
    const newUserId = new mongoose.Types.ObjectId();

    // Create tokens before creating the user to save everything in one step
    const accessToken = jwt.sign(
      { userId: newUserId },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );

    const refreshToken = jwt.sign(
      { userId: newUserId },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // ✅ Create the new user in a single, atomic database operation
    await User.create({
      _id: newUserId,
      username,
      email,
      password: hashPwd,
      publicKey, // Store the public key received from the client
      refreshToken, // Store the refresh token immediately
    });

    // Set the refresh token in an HTTP-only cookie for security
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // Use secure cookies in production
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // ✅ The response correctly sends the access token.
    res.status(201).json({
      message: `New user ${username} created`,
      accessToken: accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/**
 * Handles user login and issues new tokens securely.
 */
export const login = async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Email and password are required" });
  }

  try {
    const foundUser = await User.findOne({ email: email }).exec();

    // ✅ Securely check if the user exists and the password matches in one go.
    const match = foundUser
      ? await bcrypt.compare(password, foundUser.password)
      : false;

    // ✅ Use a generic error message to prevent user enumeration attacks.
    if (!foundUser || !match) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // User is legitimate, create new tokens
    const accessToken = jwt.sign(
      { userId: foundUser._id },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "15m" }
    );
    const refreshToken = jwt.sign(
      { userId: foundUser._id },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "7d" }
    );

    // Update the user's refresh token in the database
    foundUser.refreshToken = refreshToken;
    await foundUser.save();

    // Set the new refresh token in the cookie
    res.cookie("jwt", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "None",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // Send the access token to the client
    res.status(200).json({
      message: `${foundUser.username} welcome back`,
      accessToken: accessToken,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const logout = async (req, res) => {
  const cookies = req.cookies;

  if (!cookies?.jwt) {
    return res.sendStatus(204);
  }
  const refreshToken = cookies.jwt;

  res.clearCookie("jwt", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "None",
  });

  try {
    const foundUser = await User.findOne({ refreshToken: refreshToken });
    if (!foundUser) {
      return res.sendStatus(204);
    }

    foundUser.refreshToken = "";
    await foundUser.save();

    return res.sendStatus(204);
  } catch (err) {
    console.log(err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

export const refresh = async (req, res) => {
  const cookies = req.cookies;
  console.log(cookies);
  if (!cookies?.jwt) {
    return res.sendStatus(401);
  }
  const refreshToken = cookies.jwt;
  try {
    const foundUser = await User.findOne({ refreshToken: refreshToken }).exec();
    console.log(foundUser);
    if (!foundUser) {
      return res.status(404).json({ message: "unauthorized access" });
    }
    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      async (err, decoded) => {
        if (err || foundUser._id.toString() !== decoded.userId) {
          return res.sendStatus(403);
        }

        const accessToken = jwt.sign(
          { userId: foundUser._id },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "15m" }
        );
        const newRefreshToken = jwt.sign(
          { userId: foundUser._id },
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "7d" }
        );

        foundUser.refreshToken = newRefreshToken;
        await foundUser.save();

        res.cookie("jwt", newRefreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "None",
          maxAge: 7 * 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken });
        console.log(accessToken + "  " + refreshToken);
      }
    );
  } catch (err) {
    console.log(err);
    res.status(500).json({ message: "internal server error" });
  }
};
