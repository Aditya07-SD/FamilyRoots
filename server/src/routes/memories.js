import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.js";
import { requireTreeRole } from "../middleware/treeAccess.js";
import { config } from "../config.js";
import Memory from "../models/Memory.js";

cloudinary.config(config.cloudinary);

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    cb(allowed.includes(file.mimetype) ? null : new Error("Only JPG, PNG, WebP and GIF images are allowed"), allowed.includes(file.mimetype));
  }
});

const memorySchema = z.object({
  title: z.string().trim().max(160).optional().default(""),
  caption: z.string().trim().max(1000).optional().default(""),
  takenAt: z.string().optional().or(z.literal(""))
});

router.get("/", requireAuth, async (req, res) => {
  const memories = await Memory.find({ tree: req.tree._id })
    .populate("uploadedBy", "name avatarUrl")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ success: true, data: memories });
});

router.post("/", requireAuth, requireTreeRole, upload.single("image"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "Please choose an image (JPG, PNG, WebP or GIF), up to 10 MB." });

    const parsed = memorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ success: false, message: "Invalid memory details." });

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream({
        folder: `familyroots/${req.tree._id}/memories`,
        resource_type: "image",
        transformation: [{ width: 1600, height: 1600, crop: "limit", quality: "auto", fetch_format: "auto" }]
      }, (error, uploaded) => error ? reject(error) : resolve(uploaded));
      stream.end(req.file.buffer);
    });

    const memory = await Memory.create({
      tree: req.tree._id,
      uploadedBy: req.user._id,
      imageUrl: result.secure_url,
      publicId: result.public_id,
      title: parsed.data.title,
      caption: parsed.data.caption,
      takenAt: parsed.data.takenAt ? new Date(parsed.data.takenAt) : undefined
    });

    const populated = await Memory.findById(memory._id).populate("uploadedBy", "name avatarUrl").lean();
    res.status(201).json({ success: true, data: { memory: populated } });
  }catch (error) {
    console.error("Memory upload failed:", error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || "Failed to upload memory",
      ...(config.nodeEnv === "development" ? { error: error.message } : {})
    });
  }
});

router.delete("/:id", requireAuth, requireTreeRole, async (req, res) => {
  try {
    const memory = await Memory.findOne({ _id: req.params.id, tree: req.tree._id });
    if (!memory) return res.status(404).json({ success: false, message: "Memory not found" });

    await cloudinary.uploader.destroy(memory.publicId, { resource_type: "image" });
    await memory.deleteOne();
    res.json({ success: true, data: { id: memory._id } });
  } catch (error) {
    console.error("Memory deletion failed:", error);
    res.status(500).json({ success: false, message: "Failed to delete memory" });
  }
});

export default router;
