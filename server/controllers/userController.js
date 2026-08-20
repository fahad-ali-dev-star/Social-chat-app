import User from "../models/User.js";
import Post from "../models/Post.js";
import Notification from "../models/Notification.js";
import { escapeRegex, sanitizeQueryText, cleanString } from "../middleware/validation.js";

export const getProfile = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select("username displayName bio avatarUrl bannerUrl isVerified isPrivate followers following createdAt")
      .populate("followers following", "username displayName avatarUrl isVerified");
    if (!user) return res.status(404).json({ message: "User not found" });

    const viewer = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const blocked = viewer?.blockedUsers?.some((id) => id.toString() === user._id.toString()) ||
      viewer?.blockedBy?.some((id) => id.toString() === user._id.toString());
    if (blocked) return res.status(403).json({ message: "This profile is unavailable" });

    const isFollowing = user.followers.some((id) => id._id?.toString() === req.userId);
    const isOwn = user._id.toString() === req.userId;
    res.json({
      user,
      relationship: {
        isFollowing,
        isOwn,
        isPrivate: Boolean(user.isPrivate),
      },
    });
  } catch (err) {
    console.error("Failed to fetch profile:", err);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const toggleFollow = async (req, res) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ message: "Cannot follow yourself" });
    const [targetUser, currentUser] = await Promise.all([
      User.findById(req.params.id),
      User.findById(req.userId),
    ]);
    if (!targetUser || !currentUser) return res.status(404).json({ message: "User not found" });
    if (currentUser.blockedUsers.some((id) => id.toString() === targetUser._id.toString()) || targetUser.blockedUsers.some((id) => id.toString() === currentUser._id.toString())) {
      return res.status(403).json({ message: "Cannot follow this user" });
    }

    const isFollowing = currentUser.following.some((id) => id.toString() === targetUser._id.toString());
    const pending = targetUser.pendingFollowRequests.some((id) => id.toString() === req.userId);

    if (isFollowing) {
      currentUser.following.pull(targetUser._id);
      targetUser.followers.pull(currentUser._id);
      await Promise.all([currentUser.save(), targetUser.save()]);
      return res.json({ following: false, requested: false, followersCount: targetUser.followers.length });
    }

    if (pending) {
      targetUser.pendingFollowRequests.pull(currentUser._id);
      currentUser.sentFollowRequests.pull(targetUser._id);
      await Promise.all([currentUser.save(), targetUser.save()]);
      return res.json({ following: false, requested: false, followersCount: targetUser.followers.length });
    }

    if (targetUser.isPrivate) {
      targetUser.pendingFollowRequests.addToSet(currentUser._id);
      currentUser.sentFollowRequests.addToSet(targetUser._id);
      await Promise.all([currentUser.save(), targetUser.save()]);
      const notif = await Notification.create({ recipient: targetUser._id, sender: currentUser._id, type: "follow_request" });
      const populated = await notif.populate("sender", "username displayName avatarUrl isVerified");
      req.app.get("io").to(targetUser._id.toString()).emit("notification", populated);
      return res.json({ following: false, requested: true, followersCount: targetUser.followers.length });
    }

    currentUser.following.addToSet(targetUser._id);
    targetUser.followers.addToSet(currentUser._id);
    await Promise.all([currentUser.save(), targetUser.save()]);
    const notif = await Notification.create({ recipient: targetUser._id, sender: currentUser._id, type: "follow" });
    const populated = await notif.populate("sender", "username displayName avatarUrl isVerified");
    req.app.get("io").to(targetUser._id.toString()).emit("notification", populated);
    return res.json({ following: true, requested: false, followersCount: targetUser.followers.length });
  } catch (err) {
    console.error("Failed to toggle follow:", err);
    res.status(500).json({ message: "Failed to toggle follow" });
  }
};

export const getSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const blockedIds = [...(currentUser?.blockedUsers || []), ...(currentUser?.blockedBy || [])];
    const followingSet = new Set((currentUser?.following || []).map((id) => id.toString()));
    const exclude = [...(currentUser?.following || []).map((id) => id.toString()), req.userId, ...blockedIds.map((id) => id.toString())];

    const suggestions = await User.find({
      _id: { $nin: exclude },
      accountStatus: "active",
    })
      .select("username displayName avatarUrl isPrivate isVerified")
      .limit(6);

    const serialized = suggestions.map((u) => ({
      ...u.toObject(),
      isFollowing: followingSet.has(u._id.toString()),
    }));

    res.json({ suggestions: serialized });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch suggestions" });
  }
};

export const updateMe = async (req, res) => {
  try {
    const { displayName, bio, avatarUrl, bannerUrl, isPrivate } = req.body;
    const updates = {};
    if (displayName !== undefined) updates.displayName = cleanString(displayName, { max: 80 });
    if (bio !== undefined) updates.bio = cleanString(bio, { max: 280 });
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updates.bannerUrl = bannerUrl;
    if (isPrivate !== undefined) updates.isPrivate = Boolean(isPrivate);

    const user = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Failed to update profile" });
  }
};

export const getUserPosts = async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username }).select("_id isPrivate followers blockedUsers blockedBy");
    if (!user) return res.status(404).json({ message: "User not found" });
    const viewer = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const isOwn = user._id.toString() === req.userId;
    const following = user.followers.some((id) => id.toString() === req.userId);
    const blocked = viewer?.blockedUsers?.some((id) => id.toString() === user._id.toString()) || viewer?.blockedBy?.some((id) => id.toString() === user._id.toString());
    if (blocked) return res.status(403).json({ message: "Posts unavailable" });
    if (user.isPrivate && !isOwn && !following) return res.json({ posts: [], page: 1, hasMore: false, restricted: true });

    const page = Math.max(parseInt(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit) || 20, 1), 50);
    const posts = await Post.find({ author: user._id })
      .sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate("author", "username displayName avatarUrl isVerified isPrivate");
    const total = await Post.countDocuments({ author: user._id });
    res.json({ posts, page, hasMore: page * limit < total });
  } catch (err) {
    console.error("Failed to fetch user posts:", err);
    res.status(500).json({ message: "Failed to fetch user posts" });
  }
};

export const searchUsers = async (req, res) => {
  try {
    const q = req.query.q || "";
    const currentUser = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const blockedIds = [...(currentUser?.blockedUsers || []), ...(currentUser?.blockedBy || [])];

    // Build a Set of IDs the current user is following (canonical source of truth)
    const followingSet = new Set((currentUser?.following || []).map((id) => id.toString()));
    const followingIds = [...followingSet];

    let users;

    if (!q.trim()) {
      // No query: return following friends first, then newer users
      const friends = await User.find({
        accountStatus: "active",
        _id: { $in: followingIds },
      })
        .select("username displayName avatarUrl bio isPrivate isVerified")
        .limit(30);

      const others = await User.find({
        accountStatus: "active",
        _id: { $nin: [req.userId, ...blockedIds, ...followingIds] },
      })
        .select("username displayName avatarUrl bio isPrivate isVerified")
        .sort({ createdAt: -1 })
        .limit(30);

      users = [...friends, ...others];
    } else {
      const regex = new RegExp(escapeRegex(sanitizeQueryText(q, 80)), "i");
      users = await User.find({
        accountStatus: "active",
        _id: { $nin: [req.userId, ...blockedIds] },
        $or: [{ username: regex }, { displayName: regex }],
      })
        .select("username displayName avatarUrl bio isPrivate isVerified")
        .limit(20);
    }

    const serialized = users.map((u) => ({
      ...u.toObject(),
      isFollowing: followingSet.has(u._id.toString()),
    }));

    res.json({ users: serialized });
  } catch (err) {
    console.error("Search users error:", err);
    res.status(500).json({ message: "Failed to search users" });
  }
};

export const toggleBookmark = async (req, res) => {
  try {
    const { postId } = req.params;
    const user = await User.findById(req.userId);

    const isBookmarked = user.bookmarks.some((id) => id.toString() === postId);

    if (isBookmarked) {
      user.bookmarks = user.bookmarks.filter((id) => id.toString() !== postId);
    } else {
      user.bookmarks.push(postId);
    }

    await user.save();
    res.json({ bookmarked: !isBookmarked });
  } catch (err) {
    res.status(500).json({ message: "Failed to toggle bookmark" });
  }
};

export const getBookmarks = async (req, res) => {
  try {
    const user = await User.findById(req.userId).populate({
      path: "bookmarks",
      populate: { path: "author", select: "username displayName avatarUrl isVerified" },
    });

    res.json({ posts: user.bookmarks || [] });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
};

export const blockUser = async (req, res) => {
  try {
    if (req.params.id === req.userId) return res.status(400).json({ message: "Cannot block yourself" });
    const [me, target] = await Promise.all([User.findById(req.userId), User.findById(req.params.id)]);
    if (!me || !target) return res.status(404).json({ message: "User not found" });
    const alreadyBlocked = me.blockedUsers.some((id) => id.toString() === target._id.toString());
    if (alreadyBlocked) {
      me.blockedUsers.pull(target._id); target.blockedBy.pull(me._id);
    } else {
      me.blockedUsers.addToSet(target._id); target.blockedBy.addToSet(me._id);
      me.following.pull(target._id); target.followers.pull(me._id);
      me.sentFollowRequests.pull(target._id); target.pendingFollowRequests.pull(me._id);
      target.following.pull(me._id); me.followers.pull(target._id);

      // Remove follow/follow-request notifications between both users so a
      // blocked relationship cannot leave actionable stale notifications.
      await Notification.deleteMany({
        type: { $in: ["follow", "follow_request"] },
        $or: [
          { recipient: me._id, sender: target._id },
          { recipient: target._id, sender: me._id },
        ],
      });
    }
    await Promise.all([me.save(), target.save()]);
    res.json({ blocked: !alreadyBlocked });
  } catch (err) { console.error("Failed to block user:", err); res.status(500).json({ message: "Failed to update block status" }); }
};

export const respondToFollowRequest = async (req, res) => {
  try {
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) return res.status(400).json({ message: "Invalid action" });
    const [me, requester] = await Promise.all([User.findById(req.userId), User.findById(req.params.id)]);
    if (!me || !requester) return res.status(404).json({ message: "User not found" });
    const pending = me.pendingFollowRequests.some((id) => id.toString() === requester._id.toString());
    if (!pending) return res.status(404).json({ message: "Follow request not found" });
    me.pendingFollowRequests.pull(requester._id); requester.sentFollowRequests.pull(me._id);
    if (action === "accept") { me.followers.addToSet(requester._id); requester.following.addToSet(me._id); }
    await Promise.all([me.save(), requester.save()]);
    res.json({ accepted: action === "accept" });
  } catch (err) { console.error("Failed to respond to follow request:", err); res.status(500).json({ message: "Failed to respond to follow request" }); }
};
