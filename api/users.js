const { requireAdmin } = require("./_auth");
const { ensureUserSchema, listUsers, updateUser, upsertUser } = require("./_db");
const { hashPassword } = require("./_password");
const { readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    requireAdmin(req);
    await ensureUserSchema();

    if (req.method === "GET") {
      const users = await listUsers();
      sendJson(res, 200, { success: true, data: users.map(serializeUser) });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      validateUserPayload(body, true);
      await upsertUser({
        username: String(body.username).trim().toLowerCase(),
        displayName: String(body.displayName || body.username).trim(),
        passwordHash: await hashPassword(body.password),
        role: normalizeRole(body.role),
        isActive: body.isActive === false ? 0 : 1
      });
      sendJson(res, 200, { success: true, data: { saved: true } });
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const id = Number(body.id);
      if (!id) {
        sendJson(res, 400, { success: false, error: "User ID is required" });
        return;
      }
      const fields = {};
      if (body.displayName !== undefined) fields.displayName = String(body.displayName).trim();
      if (body.password) fields.passwordHash = await hashPassword(body.password);
      if (body.role !== undefined) fields.role = normalizeRole(body.role);
      if (body.isActive !== undefined) fields.isActive = body.isActive ? 1 : 0;
      await updateUser(id, fields);
      sendJson(res, 200, { success: true, data: { updated: true } });
      return;
    }

    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { success: false, error: error.message || "Users API failed" });
  }
};

function validateUserPayload(body, requirePassword) {
  if (!String(body.username || "").trim()) throw badRequest("Username is required");
  if (requirePassword && !String(body.password || "").trim()) throw badRequest("Password is required");
}

function normalizeRole(role) {
  const value = String(role || "staff").trim().toLowerCase();
  if (value !== "admin" && value !== "staff") throw badRequest("Role must be admin or staff");
  return value;
}

function serializeUser(user) {
  return {
    id: String(user.id),
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    isActive: Boolean(user.isActive),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt
  };
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
