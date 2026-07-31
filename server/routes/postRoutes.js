import express from "express";
import {
  createPost,
  getFeed,
  toggleLike,
  deletePost,
  getComments,
  addComment,
  searchPosts,
  getTrendingHashtags,
  updatePost,
  togglePinPost,
  toggleCommentLike,
} from "../controllers/postController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Static routes before dynamic
router.get("/search", protect, searchPosts);
router.get("/trending", protect, getTrendingHashtags);

router.get("/", protect, getFeed);
router.post("/", protect, createPost);
router.put("/:id", protect, updatePost);
router.post("/:id/pin", protect, togglePinPost);
router.post("/:id/like", protect, toggleLike);
router.delete("/:id", protect, deletePost);
router.get("/:id/comments", protect, getComments);
router.post("/:id/comments", protect, addComment);
router.post("/:id/comments/:commentId/like", protect, toggleCommentLike);

export default router;
