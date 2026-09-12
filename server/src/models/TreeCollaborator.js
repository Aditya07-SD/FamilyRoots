import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tree: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyTree", required: true, index: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  role: { type: String, enum: ["EDITOR", "VIEWER"], default: "VIEWER" }
}, { timestamps: true });

schema.index({ tree: 1, user: 1 }, { unique: true });
export default mongoose.model("TreeCollaborator", schema);
