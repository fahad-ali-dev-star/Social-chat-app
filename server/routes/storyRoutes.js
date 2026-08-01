import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createStory,
  getFeedStories,
  viewStory,
  deleteStory,
  toggleLikeStory,
} from "../controllers/storyController.js";

const router = express.Router();

router.post("/", protect, createStory);
router.get("/feed", protect, getFeedStories);
router.post("/:storyId/view", protect, viewStory);
router.post("/:storyId/like", protect, toggleLikeStory);
router.delete("/:storyId", protect, deleteStory);

export default router;
