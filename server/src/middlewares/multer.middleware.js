import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";

// Ensure upload directories exist
const avatarDir = path.join(process.cwd(), "public/uploads/avatars");
const messageDir = path.join(process.cwd(), "public/uploads/messages");
fs.mkdirSync(avatarDir, { recursive: true });
fs.mkdirSync(messageDir, { recursive: true });

// ✅ Helper: Generate a unique file name safely
function generateFilename(req, file, cb) {
  const ext = path.extname(file.originalname).toLowerCase();
  const random = crypto.randomBytes(8).toString("hex");
  const userId = req.userId || "anon";
  cb(null, `${userId}-${Date.now()}-${random}${ext}`);
}

// ✅ Avatar storage (small image files only)
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: generateFilename,
});

// ✅ Message file storage (for any chat attachments)
const messageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, messageDir),
  filename: (req, file, cb) => {
    let clientFilename = file.originalname;

    // ✅ Sanitize / encode to make URL-safe
    clientFilename = clientFilename
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=/g, "");

    cb(null, clientFilename);
  },
});

// ✅ Avatar filter: allow only images
function avatarFilter(req, file, cb) {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed for avatars"), false);
}

// ✅ Message filter: allow multiple safe file types
function messageFileFilter(req, file, cb) {
  const allowed = [
    // ... (existing image and document types) ...
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "application/pdf",
    "application/zip",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/octet-stream", // ✅ FIX: ALLOW ENCRYPTED BINARY DATA
  ];

  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type: " + file.mimetype), false); // Added mimetype to error for easier debugging
}

// ✅ Create multer uploaders
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
}).single("avatar");

export const uploadMessageFiles = multer({
  storage: messageStorage,
  fileFilter: messageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB per file
}).array("files", 5); // up to 5 attachments per message
