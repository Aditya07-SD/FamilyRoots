import { Router } from "express";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import Invitation from "../models/Invitation.js";
import TreeCollaborator from "../models/TreeCollaborator.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail } from "../utils/email.js";
import { config } from "../config.js";
import { sendSmtpEmail } from "../utils/smtpEmail.js";

const router = Router();
const requireOwner = (req,res,next) => req.treeAccess?.role === "OWNER" ? next() : res.status(403).json({success:false,message:"Owner permission required"});
const inviteSchema = z.object({
  email: z.string().trim().email().max(160),
  role: z.enum(["EDITOR", "VIEWER"]).default("VIEWER"),
  message: z.string().trim().max(500).optional()
});

router.get("/", requireAuth, async (req, res) => {
  const collaborators = await TreeCollaborator.find({ tree: req.tree._id }).populate("user", "name email").lean();
  const invitations = await Invitation.find({ tree: req.tree._id, status: "pending", expiresAt: { $gt: new Date() } }).select("-tokenHash").lean();
  res.json({ success: true, data: { collaborators, invitations } });
});

router.post("/invite", requireAuth, requireOwner, async (req, res) => {
  const parsed = inviteSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Please provide a valid email and role" });
  const { email: rawEmail, role, message = "" } = parsed.data;
  const email = rawEmail.toLowerCase();
  if (email === String(req.user.email).toLowerCase()) return res.status(400).json({ success: false, message: "You cannot invite your own account" });

  const existingUser = await User.findOne({ email }).select("_id").lean();
  if (existingUser && await TreeCollaborator.exists({ tree: req.tree._id, user: existingUser._id })) {
    return res.status(409).json({ success: false, message: "This person already has access" });
  }
  await Invitation.updateMany({ tree: req.tree._id, email, status: "pending" }, { $set: { status: "declined" } });

  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  const invitation = await Invitation.create({
    tree: req.tree._id, email, role, message, tokenHash,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  });
  const link = `${config.clientUrl}/accept-invitation?token=${rawToken}`;
  try {
    await sendSmtpEmail({
      to: email,
      from: config.email.from,
      subject: `You're invited to join ${req.tree.name} on FamilyRoots`,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto">
          <h1>FamilyRoots</h1>
  
          <p>
            ${req.user.name} invited you to join
            <strong>${req.tree.name}</strong>.
          </p>
  
          <p>
            ${message || "Build and preserve your family story together."}
          </p>
  
          <p>
            <a
              href="${link}"
              style="display:inline-block;padding:12px 18px;background:#285b3b;color:#fff;text-decoration:none;border-radius:8px"
            >
              Accept invitation
            </a>
          </p>
  
          <p>This invitation expires in 7 days.</p>
        </div>
      `
    });
  } catch (error) {
    await invitation.deleteOne();
    return res.status(error.status || 503).json({ success: false, message: error.message || "Invitation email could not be sent. Check your email configuration." });
  }
  res.status(201).json({ success: true, data: { invitation: { id: invitation._id, email, role, expiresAt: invitation.expiresAt, ...(config.nodeEnv === "development" ? { link } : {}) } } });
});

router.post("/accept", requireAuth, async (req, res) => {
  const token = String(req.body.token || "");
  if (!token) return res.status(400).json({ success: false, message: "Invitation token is required" });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const invitation = await Invitation.findOne({ tokenHash, status: "pending", expiresAt: { $gt: new Date() } });
  if (!invitation) return res.status(400).json({ success: false, message: "Invitation is invalid or expired" });
  if (invitation.email !== req.user.email) return res.status(403).json({ success: false, message: "Sign in with the invited email address" });
  await TreeCollaborator.updateOne({ tree: invitation.tree, user: req.user._id }, { $set: { role: invitation.role } }, { upsert: true });
  invitation.status = "accepted";
  await invitation.save();
  res.cookie("familyTreeId", String(invitation.tree), {
    httpOnly: true,
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    secure: config.nodeEnv === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000
  });
  res.json({ success: true, data: { treeId: invitation.tree } });
});

router.post("/:id/role", requireAuth, requireOwner, async (req, res) => {
  const role = z.enum(["EDITOR", "VIEWER"]).safeParse(req.body.role);
  if (!role.success) return res.status(400).json({ success: false, message: "Invalid role" });
  const updated = await TreeCollaborator.findOneAndUpdate({ _id: req.params.id, tree: req.tree._id }, { role: role.data }, { new: true });
  if (!updated) return res.status(404).json({ success: false, message: "Collaborator not found" });
  res.json({ success: true, data: { collaborator: updated } });
});

router.delete("/:id", requireAuth, requireOwner, async (req, res) => {
  const deleted = await TreeCollaborator.findOneAndDelete({ _id: req.params.id, tree: req.tree._id });
  if (!deleted) return res.status(404).json({ success: false, message: "Collaborator not found" });
  res.json({ success: true, data: { id: deleted._id } });
});

export default router;
