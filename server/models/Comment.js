import mongoose from "mongoose";

const commentSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: "Post", required: true },
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true, maxlength: 500 },
    parentComment: { type: mongoose.Schema.Types.ObjectId, ref: "Comment", default: null },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    isEdited: { type: Boolean, default: false },
  },
  { timestamps: true }
);

commentSchema.index({ post: 1, parentComment: 1, createdAt: 1 });

export default mongoose.model("Comment", commentSchema);
