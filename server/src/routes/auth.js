import { Router } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import User from "../models/User.js";
import FamilyTree from "../models/FamilyTree.js";
import { signToken, setAuthCookie } from "../utils/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { sendEmail } from "../utils/email.js";
import { sendSmtpEmail } from "../utils/smtpEmail.js";
import { config } from "../config.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(160),
  password: z.string().min(8).max(128)
});

const loginSchema = z.object({
  email: z.string().trim().email().max(160),
  password: z.string().min(1).max(128)
});

const verifyCodeSchema = z.object({
  email: z.string().trim().email().max(160),
  code: z.string().regex(/^\d{6}$/, "Verification code must be 6 digits")
});

const hash = value => crypto.createHash("sha256").update(value).digest("hex");

const generateOtp = () => crypto.randomInt(100000, 1000000).toString();

async function sendVerificationOtp(user, code) {
  const expiresMinutes = config.email.verificationCodeExpiresMinutes;
  await sendSmtpEmail({
    to: user.email,
    from: process.env.SMTP_USER,
    subject: "Your FamilyRoots verification code",
    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
        <h1>FamilyRoots</h1>
        <p>Hello ${user.name},</p>
        <p>Use this one-time verification code to finish creating your FamilyRoots account:</p>
        <div style="font-size:34px;font-weight:700;letter-spacing:8px;text-align:center;padding:22px;margin:24px 0;background:#f4f4f4;border-radius:12px">
          ${code}
        </div>
        <p>This code expires in ${expiresMinutes} minutes.</p>
        <p>If you did not create a FamilyRoots account, you can ignore this email.</p>
      </div>
    `
  });
}

router.post("/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Use a valid name, email and password of at least 8 characters."
    });
  }

  const { name, password } = parsed.data;
  const email = parsed.data.email.toLowerCase().trim();

  const exists = await User.findOne({ email });
  if (exists) {
    if (!exists.emailVerified) {
      return res.status(409).json({
        success: false,
        code: "EMAIL_NOT_VERIFIED",
        message: "An account with this email already exists. Verify it using the OTP."
      });
    }

    return res.status(409).json({
      success: false,
      message: "Email is already registered"
    });
  }

  const raw = crypto.randomBytes(32).toString("hex");
  const otp = generateOtp();
  const otpExpiresAt = new Date(
    Date.now() + config.email.verificationCodeExpiresMinutes * 60 * 1000
  );

  const user = await User.create({
    name,
    email,
    passwordHash: await bcrypt.hash(password, 12),
    emailVerified: false,

    // Existing Resend verification remains preserved for future use.
    verificationTokenHash: hash(raw),
    verificationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),

    // Current development OTP verification.
    verificationCodeHash: hash(otp),
    verificationCodeExpiresAt: otpExpiresAt
  });

  await FamilyTree.create({
    owner: user._id,
    name: `${name}'s Family Tree`
  });

  try {
    await sendVerificationOtp(user, otp);
  } catch (error) {
    console.error("OTP email failed:", error);

    return res.status(500).json({
      success: false,
      message: "Account was created, but we could not send the verification code. Please try again."
    });
  }

  // IMPORTANT: no auth cookie here. The user must verify the OTP first.
  return res.status(201).json({
    success: true,
    data: {
      requiresEmailVerification: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: false
      }
    },
    message: "Verification code sent to your email."
  });
});

router.post("/verify-email-code", async (req, res) => {
  const parsed = verifyCodeSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid 6-digit verification code."
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { code } = parsed.data;

  const user = await User.findOne({ email });

  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Account not found."
    });
  }

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email is already verified."
    });
  }

  if (
    !user.verificationCodeHash ||
    !user.verificationCodeExpiresAt
  ) {
    return res.status(400).json({
      success: false,
      message: "No active verification code. Please request a new code."
    });
  }

  if (user.verificationCodeExpiresAt <= new Date()) {
    return res.status(400).json({
      success: false,
      message: "Verification code has expired. Please request a new code."
    });
  }

  if (hash(code) !== user.verificationCodeHash) {
    return res.status(400).json({
      success: false,
      message: "Incorrect verification code."
    });
  }

  user.emailVerified = true;
  user.verificationCodeHash = "";
  user.verificationCodeExpiresAt = undefined;

  // Invalidate the old Resend link after successful verification.
  user.verificationTokenHash = "";
  user.verificationExpiresAt = undefined;

  await user.save();

  // Only now create the authenticated session.
  setAuthCookie(res, signToken(user._id));

  return res.json({
    success: true,
    data: {
      verified: true,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: true
      }
    },
    message: "Email verified successfully."
  });
});

router.post("/resend-code", async (req, res) => {
  const parsed = z.object({
    email: z.string().trim().email().max(160)
  }).safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Enter a valid email address."
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await User.findOne({ email });

  // Do not reveal whether an arbitrary address is registered.
  if (!user) {
    return res.json({
      success: true,
      message: "If an account exists, a new verification code has been sent."
    });
  }

  if (user.emailVerified) {
    return res.status(400).json({
      success: false,
      message: "Email is already verified."
    });
  }

  const otp = generateOtp();
  user.verificationCodeHash = hash(otp);
  user.verificationCodeExpiresAt = new Date(
    Date.now() + config.email.verificationCodeExpiresMinutes * 60 * 1000
  );
  await user.save();

  try {
    await sendVerificationOtp(user, otp);
  } catch (error) {
    console.error("OTP resend failed:", error);
    return res.status(500).json({
      success: false,
      message: "Unable to send a new verification code right now."
    });
  }

  return res.json({
    success: true,
    message: "A new verification code has been sent to your email."
  });
});

// Existing Resend link verification preserved.
router.get("/verify-email", async (req, res) => {
  const token = String(req.query.token || "");
  const user = await User.findOne({
    verificationTokenHash: hash(token),
    verificationExpiresAt: { $gt: new Date() }
  });

  if (!user) {
    return res.status(400).json({
      success: false,
      message: "Verification link is invalid or expired"
    });
  }

  user.emailVerified = true;
  user.verificationTokenHash = "";
  user.verificationExpiresAt = undefined;
  user.verificationCodeHash = "";
  user.verificationCodeExpiresAt = undefined;
  await user.save();

  setAuthCookie(res, signToken(user._id));

  res.json({
    success: true,
    data: { verified: true }
  });
});

// Existing Resend resend-link functionality preserved.
router.post("/resend-verification", requireAuth, async (req, res) => {
  if (req.user.emailVerified) {
    return res.json({
      success: true,
      data: { verified: true }
    });
  }

  const raw = crypto.randomBytes(32).toString("hex");
  req.user.verificationTokenHash = hash(raw);
  req.user.verificationExpiresAt = new Date(
    Date.now() + 24 * 60 * 60 * 1000
  );
  await req.user.save();

  await sendEmail({
    to: req.user.email,
    subject: "Verify your FamilyRoots account",
    html: `<p>Verify your FamilyRoots email:</p><p><a href="${config.clientUrl}/verify-email?token=${raw}">Verify email</a></p>`
  });

  res.json({
    success: true,
    data: { sent: true }
  });
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const user = await User.findOne({ email });

  if (
    !user ||
    !user.passwordHash ||
    !(await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return res.status(401).json({
      success: false,
      message: "Invalid email or password"
    });
  }

  if (!user.emailVerified) {
    return res.status(403).json({
      success: false,
      code: "EMAIL_NOT_VERIFIED",
      message: "Please verify your email before logging in."
    });
  }

  setAuthCookie(res, signToken(user._id));

  res.json({
    success: true,
    data: {
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        emailVerified: user.emailVerified
      }
    }
  });
});

router.get("/google", (req, res) => {
  if (!config.google.clientId) {
    return res.status(503).send("Google sign-in is not configured");
  }

  const params = new URLSearchParams({
    client_id: config.google.clientId,
    redirect_uri: config.google.callbackUrl,
    response_type: "code",
    scope: "openid email profile",
    access_type: "online",
    prompt: "select_account"
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

router.get("/google/callback", async (req, res) => {
  try {
    if (!config.google.clientId || !config.google.clientSecret) {
      throw Object.assign(
        new Error("Google sign-in is not configured"),
        { status: 503 }
      );
    }

    const tokenResponse = await fetch(
      "https://oauth2.googleapis.com/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: new URLSearchParams({
          code: String(req.query.code || ""),
          client_id: config.google.clientId,
          client_secret: config.google.clientSecret,
          redirect_uri: config.google.callbackUrl,
          grant_type: "authorization_code"
        })
      }
    );

    if (!tokenResponse.ok) {
      throw Object.assign(
        new Error("Google authorization failed"),
        { status: 401 }
      );
    }

    const tokens = await tokenResponse.json();

    const infoResponse = await fetch(
      "https://openidconnect.googleapis.com/v1/userinfo",
      {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`
        }
      }
    );

    if (!infoResponse.ok) {
      throw Object.assign(
        new Error("Google profile lookup failed"),
        { status: 401 }
      );
    }

    const info = await infoResponse.json();

    let user = await User.findOne({
      $or: [
        { googleId: info.sub },
        { email: String(info.email).toLowerCase() }
      ]
    });

    if (!user) {
      user = await User.create({
        name: info.name || "FamilyRoots member",
        email: String(info.email).toLowerCase(),
        googleId: info.sub,
        avatarUrl: info.picture || "",
        emailVerified: true
      });

      await FamilyTree.create({
        owner: user._id,
        name: `${user.name}'s Family Tree`
      });
    } else {
      user.googleId = info.sub;
      user.emailVerified = true;
      if (info.picture) user.avatarUrl = info.picture;
      await user.save();
    }

    setAuthCookie(res, signToken(user._id));
    res.redirect(`${config.clientUrl}/dashboard`);
  } catch (e) {
    res.redirect(
      `${config.clientUrl}/login?error=${encodeURIComponent(
        e.message || "Google sign-in failed"
      )}`
    );
  }
});

router.post("/logout", (req, res) => {
  const options = {
    httpOnly: true,
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    secure: config.nodeEnv === "production"
  };

  res.clearCookie("token", options);
  res.clearCookie("familyTreeId", options);

  res.json({ success: true });
});

router.get("/me", requireAuth, (req, res) =>
  res.json({
    success: true,
    data: {
      user: req.user,
      tree: req.tree,
      role: req.treeAccess.role
    }
  })
);

export default router;
