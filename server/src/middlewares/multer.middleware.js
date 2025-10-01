import multer from "multer";
import path from "path";
import fs from "fs";

// Ensure the uploads directory exists
const uploadDir = "public/uploads/avatars";
fs.mkdirSync(uploadDir, { recursive: true });

// Set up storage configuration for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir); // Directory to save the uploaded files
  },
  filename: (req, file, cb) => {
    // Create a unique filename: userId-timestamp.extension
    const uniqueSuffix = req.userId + "-" + Date.now();
    const extension = path.extname(file.originalname);
    cb(null, uniqueSuffix + extension);
  },
});

// File filter to allow only images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Only image files are allowed!"), false);
  }
};

// Create the Multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 1024 * 1024 * 2, // 2MB file size limit
  },
});

// Export the middleware for a single file upload with the field name 'avatar'
export const uploadAvatar = upload.single("avatar");
