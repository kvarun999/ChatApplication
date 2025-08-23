import mongoose from "mongoose";
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
    },
    email: {
      type: String,
      required: true,
      match: [/.+\@.+\..+/, "Please fill a valid email address"],
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    publicKey: {
      type: String,
      required: true,
    },
    avatarUrl: {
      type: String,
      default:
        "https://www.google.com/url?sa=i&url=https%3A%2F%2Fwww.veryicon.com%2Ficons%2Fmiscellaneous%2Frookie-official-icon-gallery%2F225-default-avatar.html&psig=AOvVaw38oxHg5545P5iRoXOXxVff&ust=1754406990577000&source=images&cd=vfe&opi=89978449&ved=0CBUQjRxqFwoTCNihk7658Y4DFQAAAAAdAAAAABAL",
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },
    refreshToken: String,
  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
