import express from "express";
import {
  getProfile,
  toggleFollow,
  getSuggestions,
  updateMe,
  getUserPosts,
  searchUsers,
  toggleBookmark,
  getBookmarks,
  blockUser,
  respondToFollowRequest,
} from "../controllers/userController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Static routes MUST come before /:username wildcard
router.get("/suggestions", protect, getSuggestions);
router.put("/me", protect, updateMe);
router.get("/search", protect, searchUsers);
router.get("/bookmarks", protect, getBookmarks);
router.post("/bookmarks/:postId", protect, toggleBookmark);

// Dynamic routes
router.get("/:username", protect, getProfile);
router.get("/:username/posts", protect, getUserPosts);
router.post("/:id/follow", protect, toggleFollow);
router.post("/:id/block", protect, blockUser);
router.post("/:id/follow-request", protect, respondToFollowRequest);

export default router;
