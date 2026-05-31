import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/config.js";

export function createAuthToken(user) {
  return jwt.sign(
    {
      id: user._id,
      fullName: user.fullName,
      role: user.role,
    },
    config.JWT_SECRET,
    { expiresIn: config.JWT_EXPIRES_IN }
  );
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: config.NODE_ENV === "production",
    sameSite: config.NODE_ENV === "production" ? "none" : "lax",
    maxAge: config.COOKIE_MAX_AGE_MS,
  };
}

export function setAuthCookie(res, token) {
  res.cookie("token", token, authCookieOptions());
}

export function clearAuthCookie(res) {
  res.clearCookie("token", authCookieOptions());
}

// Store only a hash in DB so leaked reset tokens cannot be used directly.
export function hashToken(token) {
  return crypto.createHash("sha256").update(token).digest("hex");
}
