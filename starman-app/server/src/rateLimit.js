import rateLimit from "express-rate-limit";

// Guards the login/register surface against brute-force and credential stuffing.
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again later." },
});

// Guards the public x-api-key surface (/api/v1) — one unauthenticated lookup per request.
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Rate limit exceeded." },
});
