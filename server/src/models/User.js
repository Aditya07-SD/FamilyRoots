import mongoose from "mongoose";

const schema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
  passwordHash: { type: String, default: "" },
  googleId: { type: String, sparse: true, unique: true },
  avatarUrl: { type: String, default: "" },
  emailVerified: { type: Boolean, default: false, index: true },
  verificationTokenHash: { type: String, default: "" },
  verificationExpiresAt: { type: Date },
  verificationCodeHash: { type: String, default: "" },
  verificationCodeExpiresAt: { type: Date },
  resetTokenHash: { type: String, default: "" },
  resetExpiresAt: { type: Date }
}, { timestamps: true });

export default mongoose.model("User", schema);
