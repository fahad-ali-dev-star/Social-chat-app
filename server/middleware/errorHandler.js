export const notFound = (req, res) => {
  res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error("Unhandled request error:", err);
  if (err?.name === "MulterError") {
    return res.status(400).json({ message: err.code === "LIMIT_FILE_SIZE" ? "File is too large" : "Upload failed" });
  }
  if (err?.name === "ValidationError") return res.status(400).json({ message: "Invalid request data" });
  if (err?.code === 11000) return res.status(409).json({ message: "A record with those values already exists" });
  res.status(err?.statusCode || 500).json({ message: err?.statusCode ? err.message : "Internal server error" });
};
