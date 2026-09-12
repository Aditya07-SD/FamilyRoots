import { Router } from "express";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import { requireAuth } from "../middleware/auth.js";
import { requireTreeRole } from "../middleware/treeAccess.js";
import { config } from "../config.js";

cloudinary.config(config.cloudinary);

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB
  },

  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only JPG, PNG and WebP images are allowed"));
    }
  },
});

router.post(
  "/photo",
  requireAuth,
  requireTreeRole,
  upload.single("photo"),
  async (req, res) => {
    try {
      // Check file
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message:
            "Please upload a JPG, PNG or WebP image up to 5 MB",
        });
      }

      // Check tree
      if (!req.tree?._id) {
        return res.status(400).json({
          success: false,
          message: "Family tree not found",
        });
      }


      const result = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: `familyroots/${req.tree._id}`,
            resource_type: "image",

            transformation: [
              {
                width: 900,
                height: 900,
                crop: "limit",
                quality: "auto",
                fetch_format: "auto",
              },
            ],
          },

          (error, result) => {
            if (error) {
              console.error("Cloudinary upload error:", error);
              reject(error);
              return;
            }

            resolve(result);
          }
        );

        stream.end(req.file.buffer);
      });


      return res.status(201).json({
        success: true,
        data: {
          photoUrl: result.secure_url,
          photoPublicId: result.public_id,
        },
      });
    } catch (error) {
      console.error("Photo upload failed:", error);

      return res.status(500).json({
        success: false,
        message: "Failed to upload photo",
        error:
          process.env.NODE_ENV === "development"
            ? error.message
            : undefined,
      });
    }
  }
);

export default router;