import { v2 as cloudinary } from "cloudinary";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import multer from "multer";
import path from "path";
import fs from "fs";

const hasCloudinary = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const allowedMimeTypes = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif",
  "video/mp4", "video/webm", "video/quicktime",
  "audio/mpeg", "audio/mp4", "audio/wav", "audio/webm",
]);

const fileFilter = (req, file, cb) => {
  if (!allowedMimeTypes.has(file.mimetype)) {
    return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "file"));
  }
  cb(null, true);
};

let storage;
if (hasCloudinary) {
  storage = new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => ({
      folder: "mern-social-app",
      resource_type: "auto",
      allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "mp4", "webm", "mov", "mp3", "m4a", "wav"],
    }),
  });
} else {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Cloudinary must be configured in production");
  }
  const uploadDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
  storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
    },
  });
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
});

export { cloudinary, hasCloudinary };
