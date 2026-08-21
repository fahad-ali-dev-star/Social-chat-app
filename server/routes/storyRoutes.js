import express from "express";
import { protect } from "../middleware/auth.js";
import {
  createStory,
  getFeedStories,
  viewStory,
  deleteStory,
  toggleLikeStory,
  getStoryViewers,
} from "../controllers/storyController.js";

const router = express.Router();

router.post("/", protect, createStory);
router.get("/feed", protect, getFeedStories);
router.get("/:storyId/viewers", protect, getStoryViewers);
router.post("/:storyId/view", protect, viewStory);
router.post("/:storyId/like", protect, toggleLikeStory);
router.delete("/:storyId", protect, deleteStory);

export default router;
