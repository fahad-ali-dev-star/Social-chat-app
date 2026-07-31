import mongoose from "mongoose";
import Report from "../models/Report.js";
import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Message from "../models/Message.js";
import Story from "../models/Story.js";

const TARGET_MODELS = { user: User, post: Post, comment: Comment, message: Message, story: Story };
const REASONS = ["spam", "harassment", "hate", "violence", "scam", "impersonation", "sexual_content", "other"];

export const createReport = async (req, res) => {
  try {
    const { targetType, targetId, reason, details = "" } = req.body;
    if (!TARGET_MODELS[targetType]) return res.status(400).json({ message: "Invalid report target" });
    if (!mongoose.isValidObjectId(targetId)) return res.status(400).json({ message: "Invalid target" });
    if (!REASONS.includes(reason)) return res.status(400).json({ message: "Invalid report reason" });
    if (targetType === "user" && String(targetId) === String(req.userId)) return res.status(400).json({ message: "Cannot report yourself" });

    const exists = await TARGET_MODELS[targetType].exists({ _id: targetId });
    if (!exists) return res.status(404).json({ message: "Reported item not found" });

    const report = await Report.create({ reporter: req.userId, targetType, targetId, reason, details: String(details).slice(0, 1000) });
    res.status(201).json({ report });
  } catch (err) {
    if (err?.code === 11000) return res.status(409).json({ message: "You already reported this item" });
    console.error("Failed to create report:", err);
    res.status(500).json({ message: "Failed to submit report" });
  }
};
