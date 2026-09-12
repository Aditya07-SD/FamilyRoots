import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tree: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyTree", required: true, index: true },
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  imageUrl: { type: String, required: true },
  publicId: { type: String, required: true },
  title: { type: String, trim: true, maxlength: 160, default: "" },
  caption: { type: String, trim: true, maxlength: 1000, default: "" },
  takenAt: { type: Date }
}, { timestamps: true });

schema.index({ tree: 1, createdAt: -1 });
export default mongoose.model("Memory", schema);
