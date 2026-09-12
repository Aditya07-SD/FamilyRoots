import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tree: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyTree", required: true, index: true },
  email: { type: String, required: true, lowercase: true, trim: true, index: true },
  role: { type: String, enum: ["EDITOR", "VIEWER"], default: "VIEWER" },
  message: { type: String, trim: true, maxlength: 500, default: "" },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  status: { type: String, enum: ["pending", "accepted", "declined"], default: "pending" }
}, { timestamps: true });

schema.index({ tree: 1, email: 1, status: 1 });
export default mongoose.model("Invitation", schema);
