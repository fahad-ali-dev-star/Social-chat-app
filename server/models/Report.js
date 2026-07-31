import mongoose from "mongoose";

const reportSchema = new mongoose.Schema(
  {
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    targetType: { type: String, enum: ["user", "post", "comment", "message", "story"], required: true, index: true },
    targetId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
    reason: {
      type: String,
      enum: ["spam", "harassment", "hate", "violence", "scam", "impersonation", "sexual_content", "other"],
      required: true,
    },
    details: { type: String, trim: true, maxlength: 1000, default: "" },
    status: { type: String, enum: ["pending", "reviewing", "resolved", "dismissed"], default: "pending", index: true },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
    resolution: { type: String, trim: true, maxlength: 1000, default: "" },
  },
  { timestamps: true }
);

reportSchema.index({ status: 1, createdAt: -1 });
reportSchema.index({ targetType: 1, targetId: 1, reporter: 1 }, { unique: true });

export default mongoose.model("Report", reportSchema);
