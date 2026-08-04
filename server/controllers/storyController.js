import Story from "../models/Story.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { cleanString } from "../middleware/validation.js";

export const createStory = async (req, res) => {
  try {
    const { mediaUrl, caption } = req.body;
    if (!mediaUrl) return res.status(400).json({ message: "Media URL is required" });

    const story = await Story.create({
      user: req.userId,
      mediaUrl,
      caption: cleanString(caption, { max: 500 }),
    });

    const populated = await story.populate("user", "username displayName avatarUrl isVerified");
    res.status(201).json({ story: populated });
  } catch (err) {
    res.status(500).json({ message: "Failed to create story" });
  }
};

export const getFeedStories = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId);
    const followingIds = currentUser.following || [];
    const allowedUserIds = [req.userId, ...followingIds];

    // Find stories created in last 24h
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const stories = await Story.find({
      user: { $in: allowedUserIds },
      createdAt: { $gte: twentyFourHoursAgo },
    })
      .sort({ createdAt: 1 })
      .populate("user", "username displayName avatarUrl isVerified")
      .populate("views.user", "username displayName avatarUrl isVerified");

    // Group stories by user
    const groupedMap = new Map();
    stories.forEach((story) => {
      const uId = story.user._id.toString();
      if (!groupedMap.has(uId)) {
        groupedMap.set(uId, {
          user: story.user,
          stories: [],
          hasUnviewed: false,
        });
      }
      const group = groupedMap.get(uId);
      const isViewedByMe = story.views.some((v) => v.user?._id?.toString() === req.userId || v.user?.toString() === req.userId);
      const isLikedByMe = (story.likes || []).some((id) => id.toString() === req.userId);
      group.stories.push({
        ...story.toObject(),
        viewedByMe: isViewedByMe,
        likedByMe: isLikedByMe,
        likesCount: story.likes?.length || 0,
      });
      if (!isViewedByMe) group.hasUnviewed = true;
    });

    // Place current user group first if present
    const groups = Array.from(groupedMap.values());
    groups.sort((a, b) => {
      if (a.user._id.toString() === req.userId) return -1;
      if (b.user._id.toString() === req.userId) return 1;
      return 0;
    });

    res.json({ storyGroups: groups });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stories" });
  }
};

export const viewStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const alreadyViewed = story.views.some(
      (v) => v.user.toString() === req.userId
    );

    if (!alreadyViewed) {
      story.views.push({ user: req.userId });
      await story.save();
    }

    res.json({ message: "Story marked as viewed", viewsCount: story.views.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to record story view" });
  }
};

export const deleteStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    if (story.user.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    await story.deleteOne();
    res.json({ message: "Story deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete story" });
  }
};

export const toggleLikeStory = async (req, res) => {
  try {
    const { storyId } = req.params;
    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    const alreadyLiked = story.likes.some((id) => id.toString() === req.userId);

    if (alreadyLiked) {
      story.likes = story.likes.filter((id) => id.toString() !== req.userId);
    } else {
      story.likes.push(req.userId);
      if (story.user.toString() !== req.userId) {
        const notif = await Notification.create({
          recipient: story.user,
          sender: req.userId,
          type: "like",
        });
        const populated = await notif.populate("sender", "username displayName avatarUrl isVerified");
        const io = req.app.get("io");
        io.to(story.user.toString()).emit("notification", populated);
      }
    }

    await story.save();
    res.json({ liked: !alreadyLiked, likesCount: story.likes.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle story like" });
  }
};
