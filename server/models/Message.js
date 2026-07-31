import mongoose from "mongoose";

const messageSchema = new mongoose.Schema(
  {
    conversation: { type: mongoose.Schema.Types.ObjectId, ref: "Conversation", required: true },
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    body: { type: String, default: "", maxlength: 2000, trim: true },
    mediaUrl: { type: String, default: "" },
    mediaType: { type: String, enum: ["image", "audio", ""], default: "" },
    deliveredAt: { type: Date, default: null },
    readAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: "Message", default: null },
    reactions: [{
      user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
      emoji: { type: String, maxlength: 16 }
    }],
  },
  { timestamps: true }
);

messageSchema.index({ conversation: 1, createdAt: -1 });
messageSchema.index({ conversation: 1, sender: 1, readAt: 1 });

messageSchema.virtual("isRead").get(function () {
  return Boolean(this.readAt);
});

messageSchema.set("toJSON", { virtuals: true });

export default mongoose.model("Message", messageSchema);
