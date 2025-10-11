import multer from "multer"; // ✅ ADDED MULTER IMPORT

export function multerErrorHandler(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    // Multer-specific errors
    if (err.code === "LIMIT_FILE_SIZE") {
      return res
        .status(400)
        .json({ message: "File size exceeds the allowed limit." });
    }
    return res.status(400).json({ message: err.message });
  } else if (err) {
    // Other errors
    return res
      .status(400)
      .json({ message: err.message || "File upload failed." });
  }
  next();
}
