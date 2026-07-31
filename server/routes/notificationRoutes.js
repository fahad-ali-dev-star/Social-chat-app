import express from "express";
import {
  getNotifications,
  markAllRead,
  getUnreadCount,
} from "../controllers/notificationController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getNotifications);
router.get("/unread-count", protect, getUnreadCount);
router.put("/read", protect, markAllRead);

export default router;
