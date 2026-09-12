import jwt from "jsonwebtoken";
import { config } from "../config.js";

export function signToken(userId) {
  return jwt.sign({}, config.jwtSecret, { subject: String(userId), expiresIn: config.jwtExpiresIn });
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, {
    httpOnly: true,
    secure: config.nodeEnv === "production",
    sameSite: config.nodeEnv === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
}
