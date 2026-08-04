import Post from "../models/Post.js";
import Comment from "../models/Comment.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import { cloudinary, hasCloudinary } from "../config/cloudinary.js";
import fs from "fs/promises";
import path from "path";
import { escapeRegex, sanitizeQueryText, cleanString } from "../middleware/validation.js";

export const createPost = async (req, res) => {
  try {
    const {
      content,
      mediaUrl,
      mediaUrls,
      mediaPublicIds,
      mediaType,
      visibility = "public",
    } = req.body;
    const finalMediaUrls = mediaUrls && mediaUrls.length > 0 ? mediaUrls : mediaUrl ? [mediaUrl] : [];
    const finalMediaPublicIds = Array.isArray(mediaPublicIds)
      ? mediaPublicIds.filter(Boolean)
      : [];

    if (!content && finalMediaUrls.length === 0) {
      return res.status(400).json({ message: "Post must contain text or media" });
    }

    if (!["public", "followers", "private"].includes(visibility)) return res.status(400).json({ message: "Invalid visibility" });
    const text = content || "";
    const hashtagMatches = [...text.matchAll(/(^|\s)#([a-zA-Z0-9_]+)/g)].map((m) => `#${m[2].toLowerCase()}`);
    const mentionNames = [...text.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)].map((m) => m[2].toLowerCase());
    const mentionedUsers = mentionNames.length ? await User.find({ username: { $in: mentionNames } }).select("_id username") : [];
    const post = await Post.create({
      author: req.userId,
      content: text,
      mediaUrl: finalMediaUrls[0] || "",
      mediaUrls: finalMediaUrls,
      mediaPublicIds: finalMediaPublicIds,
      mediaType: mediaType || "image",
      visibility,
      hashtags: [...new Set(hashtagMatches)],
      mentions: mentionedUsers.map((u) => u._id),
    });
    const populated = await post.populate("author", "username displayName avatarUrl isVerified");
    res.status(201).json({ post: populated });
  } catch (err) {
    console.error("Failed to create post:", err);
    res.status(500).json({ message: "Failed to create post" });
  }
};

const canViewPost = async (post, userId) => {
  if (!post) return false;
  const ownerId = String(post.author);
  const viewerId = String(userId);
  if (ownerId === viewerId) return true;
  const owner = await User.findById(post.author).select("followers blockedUsers blockedBy");
  if (!owner) return false;
  const blocked = [...(owner.blockedUsers || []), ...(owner.blockedBy || [])]
    .some((id) => String(id) === viewerId);
  if (blocked) return false;
  if (!post.visibility || post.visibility === "public") return true;
  if (post.visibility === "followers") {
    return (owner.followers || []).some((id) => String(id) === viewerId);
  }
  return false;
};

export const getFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const filter = req.query.filter || "all"; // "all" | "following"
    const mediaType = req.query.mediaType || ""; // "" | "image" | "video"

    const currentUser = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const followingIds = currentUser?.following || [];
    const blockedIds = [...(currentUser?.blockedUsers || []), ...(currentUser?.blockedBy || [])];
    const visibilityFilter = [
      { visibility: { $exists: false } },
      { visibility: "public" },
      { visibility: "followers", author: { $in: [req.userId, ...followingIds] } },
      { visibility: "private", author: req.userId },
    ];
    const query = { author: { $nin: blockedIds }, $or: visibilityFilter };
    if (filter === "following") query.$and = [{ author: { $in: [req.userId, ...followingIds] } }];
    if (mediaType) query.mediaType = mediaType;

    const posts = await Post.find(query)
      .sort({ isPinned: -1, createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("author", "username displayName avatarUrl isVerified");

    const currentUserId = String(req.userId);
    const serializedPosts = posts.map((post) => {
      const postObject = post.toObject();
      return {
        ...postObject,
        likesCount: Array.isArray(postObject.likes) ? postObject.likes.length : 0,
        _liked: Array.isArray(postObject.likes)
          ? postObject.likes.some((id) => String(id) === currentUserId)
          : false,
      };
    });

    const total = await Post.countDocuments(query);
    res.json({ posts: serializedPosts, page, hasMore: page * limit < total });
  } catch (err) {
    console.error("Failed to fetch feed:", err);
    res.status(500).json({ message: "Failed to fetch feed" });
  }
};

export const toggleLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!(await canViewPost(post, req.userId))) {
      return res.status(403).json({ message: "Not authorized to interact with this post" });
    }

    const alreadyLiked = post.likes.some((id) => id.toString() === req.userId);

    if (alreadyLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.userId);
    } else {
      post.likes.push(req.userId);
      if (post.author.toString() !== req.userId) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.userId,
          type: "like",
          post: post._id,
        });
        const populated = await notif.populate("sender", "username displayName avatarUrl isVerified");
        const io = req.app.get("io");
        io.to(post.author.toString()).emit("notification", populated);
      }
    }

    await post.save();
    res.json({ likesCount: post.likes.length, liked: !alreadyLiked });
  } catch (err) {
    console.error("Failed to toggle like:", err);
    res.status(500).json({ message: "Failed to toggle like" });
  }
};

export const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await Comment.deleteMany({ post: post._id });
    await Notification.deleteMany({ post: post._id });

    // Remove uploaded media after the database relationships are cleaned up.
    // Handles mediaPublicIds as well as extracting Cloudinary public IDs directly from mediaUrls
    if (hasCloudinary) {
      const publicIdsToDelete = new Set(
        Array.isArray(post.mediaPublicIds) ? post.mediaPublicIds.filter(Boolean) : []
      );

      // Extract public_id from Cloudinary URLs if mediaPublicIds is empty or incomplete
      if (Array.isArray(post.mediaUrls)) {
        for (const mediaUrl of post.mediaUrls) {
          if (!mediaUrl || typeof mediaUrl !== "string") continue;
          if (mediaUrl.includes("res.cloudinary.com")) {
            try {
              // Cloudinary URL format: https://res.cloudinary.com/<cloud_name>/<resource_type>/upload/v<version>/<public_id>.<ext>
              const parts = mediaUrl.split("/upload/");
              if (parts.length > 1) {
                const pathAfterUpload = parts[1];
                // Remove version tag (v12345678/) if present
                const withoutVersion = pathAfterUpload.replace(/^v\d+\//, "");
                // Remove file extension
                const publicId = withoutVersion.substring(0, withoutVersion.lastIndexOf(".")) || withoutVersion;
                if (publicId) publicIdsToDelete.add(publicId);
              }
            } catch (e) {
              console.error("Failed to parse Cloudinary URL public_id:", mediaUrl, e);
            }
          }
        }
      }

      for (const publicId of publicIdsToDelete) {
        try {
          const resourceType = post.mediaType === "video" ? "video" : "image";
          await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType,
            invalidate: true,
          });
        } catch (mediaErr) {
          console.error("Failed to delete Cloudinary asset:", publicId, mediaErr);
        }
      }
    } else if (!hasCloudinary && Array.isArray(post.mediaUrls)) {
      for (const mediaUrl of post.mediaUrls) {
        try {
          const url = String(mediaUrl);
          const marker = "/uploads/";
          const index = url.indexOf(marker);
          if (index !== -1) {
            const filename = decodeURIComponent(url.slice(index + marker.length).split("?")[0]);
            await fs.unlink(path.join(process.cwd(), "uploads", path.basename(filename))).catch(() => {});
          }
        } catch (mediaErr) {
          console.error("Failed to delete local media:", mediaErr);
        }
      }
    }

    await post.deleteOne();
    res.json({ message: "Post deleted" });
  } catch (err) {
    console.error("Failed to delete post:", err);
    res.status(500).json({ message: "Failed to delete post" });
  }
};

export const getComments = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id).select("author visibility");
    if (!post) return res.status(404).json({ message: "Post not found" });
    if (!(await canViewPost(post, req.userId))) {
      return res.status(403).json({ message: "Not authorized to view comments" });
    }
    const comments = await Comment.find({ post: req.params.id })
      .sort({ createdAt: 1 })
      .populate("author", "username displayName avatarUrl isVerified")
      .populate("mentions", "username displayName avatarUrl isVerified");
    const currentUserId = String(req.userId);
    const serialized = comments.map((comment) => ({
      ...comment.toObject(),
      likesCount: comment.likes.length,
      _liked: comment.likes.some((id) => String(id) === currentUserId),
    }));
    res.json({ comments: serialized });
  } catch (err) {
    console.error("Failed to fetch comments:", err);
    res.status(500).json({ message: "Failed to fetch comments" });
  }
};

export const addComment = async (req, res) => {
  try {
    const { content, parentComment = null } = req.body;
    const text = cleanString(content, { max: 500, trim: true });
    if (!text) return res.status(400).json({ message: "Comment content is required" });
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: "Post not found" });

    let parent = null;
    if (parentComment) {
      parent = await Comment.findOne({ _id: parentComment, post: post._id });
      if (!parent) return res.status(400).json({ message: "Parent comment not found" });
    }
    const mentionNames = [...text.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)].map((m) => m[2].toLowerCase());
    const mentionedUsers = mentionNames.length ? await User.find({ username: { $in: mentionNames } }).select("_id username") : [];
    const comment = await Comment.create({ post: post._id, author: req.userId, content: text, parentComment: parent?._id || null, mentions: mentionedUsers.map((u) => u._id) });
    const populated = await comment.populate([
      { path: "author", select: "username displayName avatarUrl isVerified" },
      { path: "mentions", select: "username displayName avatarUrl isVerified" },
    ]);
    post.commentCount = (post.commentCount || 0) + 1;
    await post.save();

    const recipients = new Set();
    if (post.author.toString() !== req.userId) recipients.add(post.author.toString());
    if (parent && parent.author.toString() !== req.userId) recipients.add(parent.author.toString());
    mentionedUsers.forEach((u) => { if (u._id.toString() !== req.userId) recipients.add(u._id.toString()); });
    for (const recipient of recipients) {
      const type = parent && recipient === parent.author.toString() ? "comment_reply" : mentionedUsers.some((u) => u._id.toString() === recipient) ? "mention" : "comment";
      const notif = await Notification.create({ recipient, sender: req.userId, type, post: post._id });
      const populatedNotif = await notif.populate("sender", "username displayName avatarUrl isVerified");
      req.app.get("io").to(recipient).emit("notification", populatedNotif);
    }
    res.status(201).json({ comment: populated, commentCount: post.commentCount });
  } catch (err) {
    console.error("Failed to add comment:", err);
    res.status(500).json({ message: "Failed to add comment" });
  }
};

export const toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ message: "Comment not found" });
    const liked = comment.likes.some((id) => id.toString() === req.userId);
    if (liked) comment.likes.pull(req.userId); else comment.likes.addToSet(req.userId);
    await comment.save();
    res.json({ liked: !liked, likesCount: comment.likes.length });
  } catch (err) { console.error("Failed to toggle comment like:", err); res.status(500).json({ message: "Failed to toggle comment like" }); }
};

export const searchPosts = async (req, res) => {
  try {
    const q = req.query.q || "";
    if (!q.trim()) return res.json({ posts: [] });

    const regex = new RegExp(escapeRegex(sanitizeQueryText(q, 80)), "i");
    const currentUser = await User.findById(req.userId).select("following blockedUsers blockedBy");
    const followingIds = currentUser?.following || [];
    const blockedIds = [...(currentUser?.blockedUsers || []), ...(currentUser?.blockedBy || [])];
    const visibilityFilter = [
      { visibility: { $exists: false } },
      { visibility: "public" },
      { visibility: "followers", author: { $in: [req.userId, ...followingIds] } },
      { visibility: "private", author: req.userId },
    ];
    const posts = await Post.find({
      content: regex,
      author: { $nin: blockedIds },
      $or: visibilityFilter,
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate("author", "username displayName avatarUrl isVerified");

    res.json({ posts });
  } catch (err) {
    console.error("Failed to search posts:", err);
    res.status(500).json({ message: "Failed to search posts" });
  }
};

export const updatePost = async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const post = await Post.findById(id);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (content !== undefined) {
      const text = String(content);
      post.content = text;
      post.hashtags = [...new Set([...text.matchAll(/(^|\s)#([a-zA-Z0-9_]+)/g)].map((m) => `#${m[2].toLowerCase()}`))];
      const names = [...text.matchAll(/(^|\s)@([a-zA-Z0-9_]+)/g)].map((m) => m[2].toLowerCase());
      const users = names.length ? await User.find({ username: { $in: names } }).select("_id") : [];
      post.mentions = users.map((u) => u._id);
    }
    post.isEdited = true;
    await post.save();

    const populated = await post.populate("author", "username displayName avatarUrl isVerified");
    res.json({ post: populated });
  } catch (err) {
    console.error("Failed to update post:", err);
    res.status(500).json({ message: "Failed to update post" });
  }
};

export const togglePinPost = async (req, res) => {
  try {
    const { id } = req.params;
    const post = await Post.findById(id);

    if (!post) return res.status(404).json({ message: "Post not found" });
    if (post.author.toString() !== req.userId) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const nextPinState = !post.isPinned;
    let unpinnedPostIds = [];

    if (nextPinState) {
      // Unpin all other posts by this user and return their IDs so the client
      // can update only the affected posts instead of relying on a fragile
      // client-side author comparison.
      const otherPinnedPosts = await Post.find({
        author: req.userId,
        isPinned: true,
        _id: { $ne: post._id },
      }).select("_id");
      unpinnedPostIds = otherPinnedPosts.map((item) => item._id);
      if (unpinnedPostIds.length) {
        await Post.updateMany(
          { _id: { $in: unpinnedPostIds } },
          { $set: { isPinned: false } }
        );
      }
    }

    post.isPinned = nextPinState;
    await post.save();

    res.json({
      isPinned: nextPinState,
      postId: post._id,
      unpinnedPostIds,
    });
  } catch (err) {
    console.error("Failed to pin/unpin post:", err);
    res.status(500).json({ message: "Failed to pin/unpin post" });
  }
};

export const getTrendingHashtags = async (req, res) => {
  try {
    const results = await Post.aggregate([
      { $match: {
        hashtags: { $exists: true, $ne: [] },
        $or: [{ visibility: { $exists: false } }, { visibility: "public" }],
      } },
      { $unwind: "$hashtags" },
      { $group: { _id: "$hashtags", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
      { $project: { _id: 0, tag: "$_id", count: 1 } },
    ]);
    res.json({ hashtags: results });
  } catch (err) { console.error("Failed to fetch trending hashtags:", err); res.status(500).json({ message: "Failed to fetch trending hashtags" }); }
};
