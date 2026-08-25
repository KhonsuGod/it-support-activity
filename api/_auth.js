const crypto = require("node:crypto");

const TOKEN_TTL_SECONDS = 12 * 60 * 60;

function getLoginPassword() {
  return process.env.APP_LOGIN_PASSWORD || "";
}

function getSessionSecret() {
  return process.env.APP_SESSION_SECRET || process.env.APPS_SCRIPT_API_SECRET || "";
}

function createToken() {
  const secret = getSessionSecret();
  if (!secret) throw new Error("APP_SESSION_SECRET is not configured");
  const now = Math.floor(Date.now() / 1000);
  const payload = base64Url(JSON.stringify({ iat: now, exp: now + TOKEN_TTL_SECONDS }));
  const signature = sign(payload, secret);
  return `${payload}.${signature}`;
}

function verifyToken(token) {
  const secret = getSessionSecret();
  if (!secret) return false;
  const parts = String(token || "").split(".");
  if (parts.length !== 2) return false;
  const [payload, signature] = parts;
  if (!safeEqual(signature, sign(payload, secret))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return Number(data.exp || 0) > Math.floor(Date.now() / 1000);
  } catch (error) {
    return false;
  }
}

function requireAuth(req) {
  const header = req.headers && (req.headers.authorization || req.headers.Authorization);
  const token = String(header || "").replace(/^Bearer\s+/i, "");
  if (!verifyToken(token)) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }
}

function validatePassword(password) {
  const expected = getLoginPassword();
  if (!expected) {
    const error = new Error("APP_LOGIN_PASSWORD is not configured");
    error.statusCode = 503;
    throw error;
  }
  return safeEqual(String(password || ""), expected);
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

module.exports = {
  createToken,
  requireAuth,
  validatePassword,
  verifyToken
};
