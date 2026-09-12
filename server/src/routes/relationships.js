import { Router } from "express";
import { z } from "zod";
import Relationship from "../models/Relationship.js";
import FamilyMember from "../models/FamilyMember.js";
import { requireAuth } from "../middleware/auth.js";
import { requireTreeRole } from "../middleware/treeAccess.js";

const router = Router();
const schema = z.object({
  sourceMemberId: z.string().min(1),
  targetMemberId: z.string().min(1),
  relationshipType: z.enum(["parent_of", "spouse_of", "sibling_of", "other"])
});

router.post("/", requireAuth, requireTreeRole, async (req, res) => {
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid relationship" });
  const { sourceMemberId, targetMemberId, relationshipType } = parsed.data;
  if (sourceMemberId === targetMemberId) return res.status(400).json({ success: false, message: "A member cannot relate to itself" });

  const count = await FamilyMember.countDocuments({
    tree: req.tree._id,
    _id: { $in: [sourceMemberId, targetMemberId] }
  });
  if (count !== 2) return res.status(403).json({ success: false, message: "Members do not belong to your family tree" });

  const relationship = await Relationship.create({
    tree: req.tree._id, sourceMember: sourceMemberId, targetMember: targetMemberId, relationshipType
  });
  res.status(201).json({ success: true, data: { relationship } });
});

router.delete("/:id", requireAuth, requireTreeRole, async (req, res) => {
  const relationship = await Relationship.findOneAndDelete({ _id: req.params.id, tree: req.tree._id });
  if (!relationship) return res.status(404).json({ success: false, message: "Relationship not found" });
  res.json({ success: true, data: { id: relationship._id } });
});

export default router;
