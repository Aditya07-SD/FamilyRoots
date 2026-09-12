import mongoose from "mongoose";

const schema = new mongoose.Schema({
  tree: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyTree", required: true, index: true },
  sourceMember: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
  targetMember: { type: mongoose.Schema.Types.ObjectId, ref: "FamilyMember", required: true },
  relationshipType: {
    type: String,
    enum: ["parent_of", "spouse_of", "sibling_of", "other"],
    required: true
  }
}, { timestamps: true });

schema.index({ tree: 1, sourceMember: 1 });
schema.index({ tree: 1, targetMember: 1 });
schema.index({ tree: 1, sourceMember: 1, targetMember: 1, relationshipType: 1 }, { unique: true });

export default mongoose.model("Relationship", schema);
