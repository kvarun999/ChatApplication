import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // normalize for search/uniqueness
      minlength: 3,
      maxlength: 40,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true, // normalize for search/uniqueness
      match: [/.+@.+\..+/, "Please provide a valid email address"],
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
      select: false, // never include by default
    },
    publicKey: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default: "https://static-asset.example.com/avatars/default.png", // replace with your CDN/static asset
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    refreshToken: {
      type: String,
      select: false, // do not expose by default
    },
  },
  { timestamps: true }
);

// Indexes to speed up search and uniqueness checks
userSchema.index({ username: 1 }, { unique: true }); // exact/regex prefix
userSchema.index({ email: 1 }, { unique: true }); // exact/regex prefix
// Optional text index if you later use $text search instead of $regex:
// userSchema.index({ username: "text", email: "text" });

// Ensure safe JSON output
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.refreshToken;
    return ret;
  },
});

// Optional helper virtuals (if needed later)
// userSchema.virtual("isOnline").get(function () { ... });

export default mongoose.model("User", userSchema);
