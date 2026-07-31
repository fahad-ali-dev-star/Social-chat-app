import User from "../models/User.js";
import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Message from "../models/Message.js";
import Story from "../models/Story.js";
import { escapeRegex, sanitizeQueryText } from "../middleware/validation.js";
import Report from "../models/Report.js";

export const getStats = async (req, res) => {
  try {
    const [users, posts, comments, messages, stories, pendingReports, activeUsers] = await Promise.all([
      User.countDocuments(), Post.countDocuments(), Comment.countDocuments(), Message.countDocuments(), Story.countDocuments(),
      Report.countDocuments({ status: "pending" }), User.countDocuments({ accountStatus: "active" }),
    ]);
    res.json({ stats: { users, posts, comments, messages, stories, pendingReports, activeUsers } });
  } catch (err) { console.error("Admin stats failed:", err); res.status(500).json({ message: "Failed to load statistics" }); }
};

export const listReports = async (req, res) => {
  try {
    const status = ["pending", "reviewing", "resolved", "dismissed"].includes(req.query.status) ? req.query.status : null;
    const filter = status ? { status } : {};
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 25, 1), 100);
    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
        .populate("reporter", "username displayName avatarUrl")
        .populate("reviewedBy", "username displayName"),
      Report.countDocuments(filter),
    ]);
    res.json({ reports, page, hasMore: page * limit < total, total });
  } catch (err) { console.error("Admin reports failed:", err); res.status(500).json({ message: "Failed to load reports" }); }
};

export const updateReport = async (req, res) => {
  try {
    const { status, resolution = "" } = req.body;
    if (!["pending", "reviewing", "resolved", "dismissed"].includes(status)) return res.status(400).json({ message: "Invalid status" });
    const report = await Report.findByIdAndUpdate(req.params.id, { status, resolution: String(resolution).slice(0, 1000), reviewedBy: req.userId, reviewedAt: new Date() }, { new: true })
      .populate("reporter", "username displayName avatarUrl").populate("reviewedBy", "username displayName");
    if (!report) return res.status(404).json({ message: "Report not found" });
    res.json({ report });
  } catch (err) { console.error("Admin report update failed:", err); res.status(500).json({ message: "Failed to update report" }); }
};

export const listUsers = async (req, res) => {
  try {
    const q = String(req.query.q || "").trim();
    const filter = q ? { $or: [{ username: new RegExp(escapeRegex(sanitizeQueryText(q, 80)), "i") }, { email: new RegExp(escapeRegex(sanitizeQueryText(q, 80)), "i") }] } : {};
    const users = await User.find(filter).select("username email displayName avatarUrl role accountStatus isVerified createdAt suspendedUntil").sort({ createdAt: -1 }).limit(100);
    res.json({ users });
  } catch (err) { console.error("Admin users failed:", err); res.status(500).json({ message: "Failed to load users" }); }
};

export const updateUser = async (req, res) => {
  try {
    const { accountStatus, role, isVerified, suspendedUntil, suspensionReason } = req.body;
    if (String(req.params.id) === String(req.userId) && accountStatus === "banned") return res.status(400).json({ message: "You cannot ban yourself" });
    const updates = {};
    if (accountStatus !== undefined) {
      if (!["active", "suspended", "banned"].includes(accountStatus)) return res.status(400).json({ message: "Invalid account status" });
      updates.accountStatus = accountStatus;
      if (accountStatus !== "suspended") updates.suspendedUntil = null;
    }
    if (role !== undefined) {
      if (!["user", "moderator", "admin"].includes(role)) return res.status(400).json({ message: "Invalid role" });
      if (String(req.params.id) === String(req.userId) && role !== "admin") return res.status(400).json({ message: "You cannot remove your own admin role" });
      updates.role = role;
    }
    if (isVerified !== undefined) updates.isVerified = Boolean(isVerified);
    if (suspendedUntil !== undefined && updates.accountStatus === "suspended") updates.suspendedUntil = suspendedUntil ? new Date(suspendedUntil) : null;
    if (suspensionReason !== undefined) updates.suspensionReason = String(suspensionReason).slice(0, 500);
    const user = await User.findByIdAndUpdate(req.params.id, updates, { new: true, runValidators: true }).select("username email displayName avatarUrl role accountStatus isVerified suspendedUntil suspensionReason");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ user });
  } catch (err) { console.error("Admin user update failed:", err); res.status(500).json({ message: "Failed to update user" }); }
};

export const deleteContent = async (req, res) => {
  try {
    const { type, id } = req.params;
    const Model = { post: Post, comment: Comment, message: Message, story: Story }[type];
    if (!Model) return res.status(400).json({ message: "Invalid content type" });
    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ message: "Content not found" });
    await item.deleteOne();
    if (type === "comment" && item.post) await Post.findByIdAndUpdate(item.post, { $inc: { commentCount: -1 } });
    res.json({ message: `${type} deleted` });
  } catch (err) { console.error("Admin content deletion failed:", err); res.status(500).json({ message: "Failed to delete content" }); }
};
