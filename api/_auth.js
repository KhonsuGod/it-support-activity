const crypto = require("node:crypto");
const { ensureUserSchema, findUserByUsername, hasDatabaseConfig } = require("./_db");
const { callScriptPost } = require("./_google");
const { verifyPassword } = require("./_password");

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET || process.env.APPS_SCRIPT_API_SECRET || "";
}

function createToken(user) {
  const secret = getSessionSecret();
  if (!secret) throw configuredError("APP_SESSION_SECRET is not configured", 503);
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(JSON.stringify({
    sub: String(user.id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS
  }));
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

async function authenticate(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername || !password) return null;
  if (!hasDatabaseConfig()) {
    const payload = await callScriptPost("authenticateUser", { username: normalizedUsername, password });
    return payload.data ? sanitizeUser(payload.data) : null;
  }
  await ensureUserSchema();
  const user = await findUserByUsername(normalizedUsername);
  if (!user || Number(user.isActive) !== 1) return null;
  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) return null;
  return sanitizeUser(user);
}

function requireAuth(req) {
  const user = getUserFromRequest(req);
  if (!user) throw configuredError("Unauthorized", 401);
  return user;
}

function requireAdmin(req) {
  const user = requireAuth(req);
  if (user.role !== "admin") throw configuredError("Forbidden", 403);
  return user;
}

function getUserFromRequest(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const token = String(header || "").replace(/^Bearer\s+/i, "");
  const payload = verifyToken(token);
  return payload ? sanitizeUser(payload) : null;
}

function verifyToken(token) {
  const secret = getSessionSecret();
  if (!secret) return null;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return null;
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload, secret))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (Number(data.exp || 0) <= Math.floor(Date.now() / 1000)) return null;
    return data;
  } catch (error) {
    return null;
  }
}

function sanitizeUser(user) {
  return {
    id: String(user.id || user.sub || ""),
    username: String(user.username || ""),
    displayName: String(user.displayName || user.display_name || user.username || ""),
    role: String(user.role || "staff")
  };
}

function sign(payload, secret) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function base64Url(value) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(a, b) {
  const aBuffer = Buffer.from(String(a));
  const bBuffer = Buffer.from(String(b));
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function configuredError(message, statusCode) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

module.exports = {
  authenticate,
  createToken,
  getUserFromRequest,
  requireAdmin,
  requireAuth,
  verifyToken
};
