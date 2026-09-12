import TreeCollaborator from "../models/TreeCollaborator.js";

export async function requireTreeRole(req, res, next) {
  const role = req.treeAccess?.role;
  if (!role) return res.status(403).json({ success: false, message: "Family tree access denied" });
  if (req.method !== "GET" && role === "VIEWER") {
    return res.status(403).json({ success: false, message: "Viewer access is read-only" });
  }
  next();
}

export async function resolveTreeAccess(req, treeId) {
  if (!treeId) return null;
  if (String(req.tree?._id) === String(treeId)) return { role: "OWNER" };
  const collaborator = await TreeCollaborator.findOne({ tree: treeId, user: req.user._id }).lean();
  return collaborator ? { role: collaborator.role } : null;
}
