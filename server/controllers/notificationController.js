import Notification from "../models/Notification.js";

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate("sender", "username displayName avatarUrl")
      .populate("post", "content");
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.userId, read: false }, { read: true });
    res.json({ message: "All notifications marked as read" });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications as read" });
  }
};

export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.userId, read: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch unread count" });
  }
};
