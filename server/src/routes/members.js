import { Router } from "express";
import { z } from "zod";
import FamilyMember from "../models/FamilyMember.js";
import Relationship from "../models/Relationship.js";
import { requireAuth } from "../middleware/auth.js";
import { requireTreeRole } from "../middleware/treeAccess.js";

const router = Router();

const memberSchema = z.object({
  fullName: z.string().trim().min(1).max(160),
  photoUrl: z.string().url().optional().or(z.literal("")),
  photoPublicId: z.string().max(300).optional(),
  gender: z.enum(["male", "female", "nonbinary", "unknown"]).optional(),
  dateOfBirth: z.string().optional().or(z.literal("")),
  dateOfDeath: z.string().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  email: z.string().email().max(160).optional().or(z.literal("")),
  occupation: z.string().max(160).optional(),
  location: z.string().max(200).optional(),
  biography: z.string().max(5000).optional(),
  notes: z.string().max(5000).optional(),
  customInfo: z.record(z.string()).optional()
});

function clean(body) {
  const p = memberSchema.parse(body);
  return {
    ...p,
    dateOfBirth: p.dateOfBirth ? new Date(p.dateOfBirth) : undefined,
    dateOfDeath: p.dateOfDeath ? new Date(p.dateOfDeath) : undefined
  };
}

router.get("/", requireAuth, async (req, res) => {
  const page = Math.max(Number(req.query.page || 1), 1);
  const limit = Math.min(Math.max(Number(req.query.limit || 50), 1), 200);
  const [items, total] = await Promise.all([
    FamilyMember.find({ tree: req.tree._id }).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    FamilyMember.countDocuments({ tree: req.tree._id })
  ]);
  res.json({ success: true, data: { items, page, limit, total } });
});

router.get("/search", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ success: true, data: [] });
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");
  const items = await FamilyMember.find({
    tree: req.tree._id,
    $or: [{ fullName: re }, { occupation: re }, { location: re }]
  }).limit(30).lean();
  res.json({ success: true, data: items });
});

router.get("/:id", requireAuth, async (req, res) => {
  const member = await FamilyMember.findOne({ _id: req.params.id, tree: req.tree._id }).lean();
  if (!member) return res.status(404).json({ success: false, message: "Family member not found" });
  const relationships = await Relationship.find({
    tree: req.tree._id,
    $or: [{ sourceMember: member._id }, { targetMember: member._id }]
  }).lean();
  res.json({ success: true, data: { member, relationships } });
});

router.post("/", requireAuth, requireTreeRole, async (req, res) => {
  const member = await FamilyMember.create({ tree: req.tree._id, ...clean(req.body) });
  res.status(201).json({ success: true, data: { member } });
});

router.put("/:id", requireAuth, requireTreeRole, async (req, res) => {
  const member = await FamilyMember.findOneAndUpdate(
    { _id: req.params.id, tree: req.tree._id },
    { $set: clean(req.body) },
    { new: true, runValidators: true }
  );
  if (!member) return res.status(404).json({ success: false, message: "Family member not found" });
  res.json({ success: true, data: { member } });
});

router.delete("/:id", requireAuth, requireTreeRole, async (req, res) => {
  const member = await FamilyMember.findOneAndDelete({ _id: req.params.id, tree: req.tree._id });
  if (!member) return res.status(404).json({ success: false, message: "Family member not found" });
  await Relationship.deleteMany({
    tree: req.tree._id,
    $or: [{ sourceMember: member._id }, { targetMember: member._id }]
  });
  res.json({ success: true, data: { id: member._id } });
});

export default router;
