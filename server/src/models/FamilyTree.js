import mongoose from "mongoose";

const schema = new mongoose.Schema({
  owner: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
  name: { type: String, default: "My Family Tree", trim: true, maxlength: 120 },
  description: { type: String, default: "", trim: true, maxlength: 1000 }
}, { timestamps: true });

export default mongoose.model("FamilyTree", schema);
