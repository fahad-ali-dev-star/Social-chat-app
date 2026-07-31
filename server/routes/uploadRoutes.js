import express from "express";
import { upload, hasCloudinary } from "../config/cloudinary.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.post("/", protect, upload.single("file"), (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded" });
  const fileUrl = req.file.path || req.file.secure_url;
  if (!fileUrl || !String(fileUrl).startsWith("http")) {
    if (hasCloudinary || process.env.NODE_ENV === "production") {
      return res.status(500).json({ message: "Upload storage is unavailable" });
    }
    const baseUrl = `${req.protocol}://${req.get("host")}`;
    return res.json({ url: `${baseUrl}/uploads/${req.file.filename}` });
  }
  res.json({
    url: fileUrl,
    publicId: hasCloudinary ? (req.file.public_id || req.file.filename || "") : "",
    resourceType: hasCloudinary ? (req.file.resource_type || "image") : "raw",
  });
});

export default router;
