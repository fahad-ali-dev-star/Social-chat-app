import express from "express";
import {
  getConversations,
  getOrCreateConversation,
  getMessages,
  sendMessage,
  markConversationRead,
  editMessage,
  deleteMessage,
  reactToMessage,
  removeMessageReaction,
  updateConversationSettings,
} from "../controllers/messageController.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

router.get("/", protect, getConversations);
router.post("/conversation", protect, getOrCreateConversation);

router.post("/:conversationId/read", protect, markConversationRead);
router.patch("/:conversationId/settings", protect, updateConversationSettings);

router.patch("/message/:messageId", protect, editMessage);
router.delete("/message/:messageId", protect, deleteMessage);
router.post("/message/:messageId/reactions", protect, reactToMessage);
router.delete("/message/:messageId/reactions", protect, removeMessageReaction);

router.get("/:conversationId", protect, getMessages);
router.post("/:conversationId", protect, sendMessage);

export default router;
