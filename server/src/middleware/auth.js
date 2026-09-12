import jwt from "jsonwebtoken";
import User from "../models/User.js";
import FamilyTree from "../models/FamilyTree.js";
import TreeCollaborator from "../models/TreeCollaborator.js";
import { config } from "../config.js";

export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) return res.status(401).json({ success: false, message: "Authentication required" });
    const payload = jwt.verify(token, config.jwtSecret);
    const user = await User.findById(payload.sub).select("_id name email emailVerified avatarUrl");
    if (!user) return res.status(401).json({ success: false, message: "Invalid session" });
    req.user = user;

    const requestedTreeId = req.get("X-Family-Tree-Id") || req.query.treeId || req.cookies?.familyTreeId;
    let tree = requestedTreeId ? await FamilyTree.findById(requestedTreeId) : await FamilyTree.findOne({ owner: user._id });
    if (!tree) return res.status(404).json({ success: false, message: "Family tree not found" });

    const owner = String(tree.owner) === String(user._id);
    const collaborator = owner ? null : await TreeCollaborator.findOne({ tree: tree._id, user: user._id }).lean();
    if (!owner && !collaborator) return res.status(403).json({ success: false, message: "You do not have access to this family tree" });
    req.tree = tree;
    req.treeAccess = { role: owner ? "OWNER" : collaborator.role };
    next();
  } catch {
    return res.status(401).json({ success: false, message: "Invalid or expired session" });
  }
}
