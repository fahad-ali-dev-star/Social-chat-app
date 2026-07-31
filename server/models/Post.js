import mongoose from "mongoose";

const postSchema = new mongoose.Schema(
  {
    author: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, default: "", maxlength: 2000 },
    visibility: { type: String, enum: ["public", "followers", "private"], default: "public", index: true },
    hashtags: [{ type: String, lowercase: true, trim: true }],
    mentions: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    mediaUrl: { type: String, default: "" },
    mediaUrls: [{ type: String }],
    mediaPublicIds: [{ type: String }],
    mediaType: { type: String, enum: ["image", "video", ""], default: "image" },
    isPinned: { type: Boolean, default: false },
    isEdited: { type: Boolean, default: false },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    commentCount: { type: Number, default: 0 },
    repostOf: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
    quotePost: { type: mongoose.Schema.Types.ObjectId, ref: "Post", default: null },
  },
  { timestamps: true }
);

postSchema.index({ createdAt: -1 });
postSchema.index({ content: "text" });
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ hashtags: 1, createdAt: -1 });
postSchema.index({ visibility: 1, createdAt: -1 });

export default mongoose.model("Post", postSchema);
