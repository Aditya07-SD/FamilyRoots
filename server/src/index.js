import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { connectDB } from "./db.js";
import { config } from "./config.js";
import auth from "./routes/auth.js";
import tree from "./routes/tree.js";
import members from "./routes/members.js";
import relationships from "./routes/relationships.js";
import uploads from "./routes/uploads.js";
import events from "./routes/events.js";
import collaborators from "./routes/collaborators.js";
import dashboard from "./routes/dashboard.js";
import memories from "./routes/memories.js";
import { notFound, errorHandler } from "./middleware/error.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: config.clientUrl, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());

app.use("/api/auth", rateLimit({ windowMs: 15 * 60 * 1000, limit: 100, standardHeaders: "draft-7", legacyHeaders: false }));
app.use("/api", rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: "draft-7", legacyHeaders: false }));

app.get("/api/health", (req, res) => res.json({ success: true, data: { status: "ok" } }));
app.use("/api/auth", auth);
app.use("/api/tree", tree);
app.use("/api/members", members);
app.use("/api/relationships", relationships);
app.use("/api/uploads", uploads);
app.use("/api/memories", memories);
app.use("/api/events", events);
app.use("/api/collaborators", collaborators);
app.use("/api/dashboard", dashboard);

app.use(notFound);
app.use(errorHandler);

connectDB().then(() => {
  app.listen(config.port, () => console.log(`FamilyRoots API running on http://localhost:${config.port}`));
}).catch(err => {
  console.error("Database startup failed:", err);
  process.exit(1);
});
