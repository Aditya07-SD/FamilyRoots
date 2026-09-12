import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import FamilyMember from "../models/FamilyMember.js";
import Relationship from "../models/Relationship.js";
import FamilyEvent from "../models/FamilyEvent.js";
import TreeCollaborator from "../models/TreeCollaborator.js";

const router=Router();
router.get("/", requireAuth, async (req,res)=>{
  const treeId=req.tree._id;
  const [members,relationships,events,collaborators]=await Promise.all([
    FamilyMember.countDocuments({tree:treeId}),
    Relationship.countDocuments({tree:treeId}),
    FamilyEvent.find({tree:treeId}).sort({date:-1}).limit(5).populate("member","fullName photoUrl").lean(),
    TreeCollaborator.countDocuments({tree:treeId})
  ]);
  const allMembers=await FamilyMember.find({tree:treeId}).select("_id dateOfBirth dateOfDeath createdAt").lean();
  const years=allMembers.flatMap(m=>[m.dateOfBirth?new Date(m.dateOfBirth).getFullYear():null,m.dateOfDeath?new Date(m.dateOfDeath).getFullYear():null]).filter(Boolean);
  const generations=new Set();
  const parentEdges=await Relationship.find({tree:treeId,relationshipType:"parent_of"}).select("sourceMember targetMember").lean();
  const parents=new Map(parentEdges.map(e=>[String(e.targetMember),String(e.sourceMember)]));
  const level=id=>{let n=0,seen=new Set();while(parents.has(id)&&!seen.has(id)){seen.add(id);id=parents.get(id);n++}return n};
  allMembers.forEach(m=>generations.add(level(String(m._id))));
  res.json({success:true,data:{stats:{members,relationships,generations:generations.size||0,collaborators},events,years}});
});
export default router;
