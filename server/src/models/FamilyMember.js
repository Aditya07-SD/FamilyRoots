import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tree: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyTree", required: true, index: true },
  fullName: { type: String, required: true, trim: true, maxlength: 160 },
  photoUrl: { type: String, default: "" },
  photoPublicId: { type: String, default: "" },
  gender: { type: String, enum: ["male", "female", "nonbinary", "unknown"], default: "unknown" },
  dateOfBirth: { type: Date },
  dateOfDeath: { type: Date },
  phone: { type: String, trim: true, maxlength: 40 },
  email: { type: String, trim: true, maxlength: 160 },
  occupation: { type: String, trim: true, maxlength: 160 },
  location: { type: String, trim: true, maxlength: 200 },
  biography: { type: String, trim: true, maxlength: 5000 },
  notes: { type: String, trim: true, maxlength: 5000 },
  customInfo: { type: Map, of: String, default: {} }
}, { timestamps: true });

schema.index({ tree: 1, fullName: 1 });
schema.index({ tree: 1, occupation: 1 });
schema.index({ tree: 1, location: 1 });

export default mongoose.model("FamilyMember", schema);
