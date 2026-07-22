import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const hashPassword = (pw) => bcrypt.hash(pw, 10);
export const verifyPassword = (pw, hash) => bcrypt.compare(pw, hash);

export function signToken(user) {
  return jwt.sign(
    { sub: user.id, orgId: user.orgId, role: user.role, name: user.name },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn, algorithm: "HS256" }
  );
}

// Verifies the Bearer token and attaches { id, orgId, role, name } to req.user.
export function authRequired(req, res, next) {
  const h = req.headers.authorization || "";
  const token = h.startsWith("Bearer ") ? h.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentication required" });
  try {
    const p = jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"] });
    req.user = { id: p.sub, orgId: p.orgId, role: p.role, name: p.name };
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

// Optional role gate, e.g. roleRequired("OWNER","COMPLIANCE")
export function roleRequired(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
}
