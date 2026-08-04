import mongoose from "mongoose";
import Conversation from "../models/Conversation.js";
import Message from "../models/Message.js";
import User from "../models/User.js";

const isMember = (conversation, userId) =>
  conversation?.participants?.some((id) => id.toString() === String(userId));

const emitToConversation = (req, conversationId, event, payload) => {
  req.app.get("io")?.to(`conv_${conversationId}`).emit(event, payload);
};

const populateMessage = (query) =>
  query
    .populate("sender", "username displayName avatarUrl isVerified")
    .populate({
      path: "replyTo",
      populate: { path: "sender", select: "username displayName avatarUrl isVerified" },
    });

export const getConversations = async (req, res) => {
  try {
    const userId = req.userId;
    const conversations = await Conversation.aggregate([
      { $match: { participants: new mongoose.Types.ObjectId(userId) } },
      { $sort: { updatedAt: -1 } },
      {
        $lookup: {
          from: "messages",
          let: { conversationId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$conversation", "$$conversationId"] },
                    { $ne: ["$sender", new mongoose.Types.ObjectId(userId)] },
                    { $eq: ["$readAt", null] },
                    { $eq: ["$deletedAt", null] },
                  ],
                },
              },
            },
            { $count: "count" },
          ],
          as: "unread",
        },
      },
      {
        $addFields: {
          unreadCount: { $ifNull: [{ $arrayElemAt: ["$unread.count", 0] }, 0] },
        },
      },
      { $project: { unread: 0 } },
    ]);

    const populated = await Conversation.populate(conversations, [
      { path: "participants", select: "username displayName avatarUrl isVerified" },
      { path: "lastSender", select: "username displayName isVerified" },
    ]);

    res.json({ conversations: populated });
  } catch (err) {
    console.error("Failed to fetch conversations:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

export const getOrCreateConversation = async (req, res) => {
  try {
    const { recipientId } = req.body;
    if (!mongoose.isValidObjectId(recipientId)) {
      return res.status(400).json({ message: "Valid recipient ID is required" });
    }
    if (String(recipientId) === String(req.userId)) {
      return res.status(400).json({ message: "Cannot message yourself" });
    }

    const [recipient, sender] = await Promise.all([
      User.findById(recipientId).select("username displayName avatarUrl blockedUsers blockedBy isPrivate followers"),
      User.findById(req.userId).select("blockedUsers blockedBy following"),
    ]);
    if (!recipient) return res.status(404).json({ message: "User not found" });

    const blocked =
      recipient.blockedUsers.some((id) => id.toString() === String(req.userId)) ||
      recipient.blockedBy.some((id) => id.toString() === String(req.userId)) ||
      sender.blockedUsers.some((id) => id.toString() === String(recipientId));

    if (blocked) return res.status(403).json({ message: "Messaging is unavailable for this user" });

    if (recipient.isPrivate && !recipient.followers?.some((id) => id.toString() === String(req.userId))) {
      return res.status(403).json({ message: "Follow this user before starting a conversation" });
    }

    let conversation = await Conversation.findOne({
      participants: { $all: [req.userId, recipientId] },
      $expr: { $eq: [{ $size: "$participants" }, 2] },
    }).populate("participants", "username displayName avatarUrl");

    if (!conversation) {
      conversation = await Conversation.create({ participants: [req.userId, recipientId] });
      conversation = await conversation.populate("participants", "username displayName avatarUrl");
    }

    res.json({ conversation });
  } catch (err) {
    console.error("Failed to create conversation:", err);
    res.status(500).json({ message: "Failed to create conversation" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { before, limit = 40 } = req.query;
    if (!mongoose.isValidObjectId(conversationId)) {
      return res.status(400).json({ message: "Invalid conversation ID" });
    }

    const conversation = await Conversation.findById(conversationId).select("participants");
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });

    const safeLimit = Math.min(Math.max(Number(limit) || 40, 1), 100);
    const filter = { conversation: conversationId };
    if (before && mongoose.isValidObjectId(before)) {
      const cursor = await Message.findById(before).select("createdAt");
      if (cursor) filter.createdAt = { $lt: cursor.createdAt };
    }

    const rows = await populateMessage(
      Message.find(filter).sort({ createdAt: -1 }).limit(safeLimit)
    );
    const messages = rows.reverse();

    const readResult = await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.userId }, readAt: null, deletedAt: null },
      { $set: { readAt: new Date() } }
    );

    if (readResult.modifiedCount) {
      emitToConversation(req, conversationId, "messages_read", {
        conversationId,
        readerId: String(req.userId),
      });
    }

    res.json({
      messages,
      hasMore: messages.length === safeLimit,
      nextCursor: messages.length ? messages[0]._id : null,
    });
  } catch (err) {
    console.error("Failed to fetch messages:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const conversation = await Conversation.findById(conversationId).select("participants");
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });

    const result = await Message.updateMany(
      { conversation: conversationId, sender: { $ne: req.userId }, readAt: null, deletedAt: null },
      { $set: { readAt: new Date() } }
    );

    emitToConversation(req, conversationId, "messages_read", {
      conversationId,
      readerId: String(req.userId),
    });

    res.json({ updated: result.modifiedCount });
  } catch (err) {
    console.error("Failed to mark messages read:", err);
    res.status(500).json({ message: "Failed to mark messages read" });
  }
};

export const sendMessage = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { body, mediaUrl, mediaType, replyTo } = req.body;

    if ((!body || !body.trim()) && !mediaUrl) {
      return res.status(400).json({ message: "Message content or media is required" });
    }

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });
    if (conversation.blockedBy?.length) return res.status(403).json({ message: "Conversation is blocked" });

    if (replyTo) {
      if (!mongoose.isValidObjectId(replyTo)) return res.status(400).json({ message: "Invalid reply message" });
      const parent = await Message.findOne({ _id: replyTo, conversation: conversationId });
      if (!parent) return res.status(400).json({ message: "Reply target not found" });
    }

    const recipientId = conversation.participants.find((id) => id.toString() !== String(req.userId));
    if (recipientId) {
      const recipient = await User.findById(recipientId).select("blockedUsers blockedBy");
      if (
        recipient?.blockedUsers?.some((id) => id.toString() === String(req.userId)) ||
        recipient?.blockedBy?.some((id) => id.toString() === String(req.userId))
      ) {
        return res.status(403).json({ message: "Messaging is unavailable for this user" });
      }
    }

    const message = await Message.create({
      conversation: conversationId,
      sender: req.userId,
      body: body ? body.trim() : "",
      mediaUrl: mediaUrl || "",
      mediaType: mediaType || "",
      replyTo: replyTo || null,
    });

    const recipientRoom = recipientId?.toString();
    const io = req.app.get("io");
    const recipientOnline = recipientRoom && (io?.sockets?.adapter?.rooms?.get(recipientRoom)?.size || 0) > 0;
    if (recipientOnline) message.deliveredAt = new Date();
    await message.save();

    const previewText = body?.trim() || (mediaType === "audio" ? "🎙️ Voice note" : "📷 Photo");
    conversation.lastMessage = previewText;
    conversation.lastSender = req.userId;
    conversation.updatedAt = new Date();
    await conversation.save();

    const populated = await populateMessage(Message.findById(message._id));

    // Emit to conversation room (active chat viewers receive it live instantly)
    io?.to(`conv_${conversationId}`).emit("new_message", {
      message: populated,
      conversationId,
    });

    // Also emit to recipient's personal room for toasts and unread badges
    if (recipientId) {
      io?.to(recipientRoom).emit("new_message", {
        message: populated,
        conversationId,
      });
      if (message.deliveredAt) {
        io?.to(recipientRoom).emit("message_delivered", {
          conversationId,
          messageId: String(message._id),
          deliveredAt: message.deliveredAt,
        });
      }
    }

    res.status(201).json({ message: populated });
  } catch (err) {
    console.error("Failed to send message:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const body = typeof req.body.body === "string" ? req.body.body.trim() : "";
    if (!body) return res.status(400).json({ message: "Message body is required" });

    const message = await Message.findOne({ _id: messageId, sender: req.userId, deletedAt: null });
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.body = body;
    message.editedAt = new Date();
    await message.save();
    const populated = await populateMessage(Message.findById(message._id));

    emitToConversation(req, message.conversation, "message_updated", { message: populated });
    res.json({ message: populated });
  } catch (err) {
    console.error("Failed to edit message:", err);
    res.status(500).json({ message: "Failed to edit message" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findOne({ _id: req.params.messageId, sender: req.userId, deletedAt: null });
    if (!message) return res.status(404).json({ message: "Message not found" });

    message.deletedAt = new Date();
    message.body = "";
    message.mediaUrl = "";
    message.mediaType = "";
    await message.save();

    emitToConversation(req, message.conversation, "message_deleted", {
      messageId: String(message._id),
      conversationId: String(message.conversation),
      deletedAt: message.deletedAt,
    });
    res.json({ messageId: message._id, deletedAt: message.deletedAt });
  } catch (err) {
    console.error("Failed to delete message:", err);
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const reactToMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const emoji = typeof req.body.emoji === "string" ? req.body.emoji.trim().slice(0, 16) : "";
    if (!emoji) return res.status(400).json({ message: "Emoji is required" });

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const conversation = await Conversation.findById(message.conversation).select("participants");
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });

    message.reactions = message.reactions.filter((r) => r.user.toString() !== String(req.userId));
    message.reactions.push({ user: req.userId, emoji });
    await message.save();

    emitToConversation(req, message.conversation, "message_reaction", {
      messageId: String(message._id),
      reactions: message.reactions,
    });
    res.json({ reactions: message.reactions });
  } catch (err) {
    console.error("Failed to react to message:", err);
    res.status(500).json({ message: "Failed to react to message" });
  }
};

export const removeMessageReaction = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    const conversation = await Conversation.findById(message.conversation).select("participants");
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });

    message.reactions = message.reactions.filter((r) => r.user.toString() !== String(req.userId));
    await message.save();

    emitToConversation(req, message.conversation, "message_reaction", {
      messageId: String(message._id),
      reactions: message.reactions,
    });
    res.json({ reactions: message.reactions });
  } catch (err) {
    console.error("Failed to remove message reaction:", err);
    res.status(500).json({ message: "Failed to remove message reaction" });
  }
};

export const updateConversationSettings = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { muted, archived, blocked } = req.body;
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) return res.status(404).json({ message: "Conversation not found" });
    if (!isMember(conversation, req.userId)) return res.status(403).json({ message: "Not authorized" });

    const userId = String(req.userId);
    const updateArray = (arr, enabled) => {
      const values = arr.map(String).filter((id) => id !== userId);
      if (enabled) values.push(userId);
      return [...new Set(values)];
    };

    if (typeof muted === "boolean") conversation.mutedBy = updateArray(conversation.mutedBy || [], muted);
    if (typeof archived === "boolean") conversation.archivedBy = updateArray(conversation.archivedBy || [], archived);
    if (typeof blocked === "boolean") conversation.blockedBy = updateArray(conversation.blockedBy || [], blocked);

    await conversation.save();
    res.json({
      conversation: {
        _id: conversation._id,
        muted: conversation.mutedBy.some((id) => id.toString() === userId),
        archived: conversation.archivedBy.some((id) => id.toString() === userId),
        blocked: conversation.blockedBy.some((id) => id.toString() === userId),
      },
    });
  } catch (err) {
    console.error("Failed to update conversation settings:", err);
    res.status(500).json({ message: "Failed to update conversation settings" });
  }
};
