import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema(
  {
    participants: [{ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }],
    lastMessage: { type: String, default: "" },
    lastSender: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    mutedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    archivedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    blockedBy: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  },
  { timestamps: true }
);

conversationSchema.index({ participants: 1 });
conversationSchema.index({ updatedAt: -1 });

export default mongoose.model("Conversation", conversationSchema);
