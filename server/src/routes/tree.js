import { Router } from "express";
import FamilyMember from "../models/FamilyMember.js";
import FamilyTree from "../models/FamilyTree.js";
import Relationship from "../models/Relationship.js";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";

const router = Router();
const treeSchema=z.object({name:z.string().trim().min(1).max(120).optional(),description:z.string().trim().max(1000).optional()});

router.put("/", requireAuth, async (req,res)=>{ if(req.treeAccess.role!=="OWNER") return res.status(403).json({success:false,message:"Owner permission required"}); const p=treeSchema.safeParse(req.body); if(!p.success)return res.status(400).json({success:false,message:"Invalid tree settings"}); const tree=await FamilyTree.findByIdAndUpdate(req.tree._id,{$set:p.data},{new:true,runValidators:true}); res.json({success:true,data:{tree}}); });

router.get("/", requireAuth, async (req, res) => {
  const [members, relationships] = await Promise.all([
    FamilyMember.find({ tree: req.tree._id }).sort({ createdAt: 1 }).lean(),
    Relationship.find({ tree: req.tree._id }).lean()
  ]);
  res.json({ success: true, data: { tree: req.tree, members, relationships } });
});

export default router;
