import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const connectDB = async () => {
  try {
    console.log(process.env.MONGODB_URI);
    await mongoose.connect(process.env.MONGODB_URI || "");
    console.log("MongoDB connected");
  } catch (err) {
    if (err instanceof Error) {
      console.error("MongoDB connection failed:", err.message);
    } else {
      console.error("MongoDB connection failed:", err);
    }
    process.exit(1); // Exit process with failure
  }
};

export default connectDB; 