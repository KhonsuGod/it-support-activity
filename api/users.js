const { requireAdmin } = require("./_auth");
const { ensureUserSchema, hasDatabaseConfig, listUsers, updateUser, upsertUser } = require("./_db");
const { hashPassword } = require("./_password");
const { callScriptPost, readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    requireAdmin(req);
    if (!hasDatabaseConfig()) {
      await handleScriptUsers(req, res);
      return;
    }

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

async function handleScriptUsers(req, res) {
  if (req.method === "GET") {
    const payload = await callScriptPost("listUsers");
    sendJson(res, 200, { success: true, data: payload.data.map(serializeUser) });
    return;
  }

  if (req.method === "POST") {
    const body = await readBody(req);
    validateUserPayload(body, true);
    const payload = await callScriptPost("createUser", {
      user: {
        username: String(body.username).trim().toLowerCase(),
        displayName: String(body.displayName || body.username).trim(),
        password: body.password,
        role: normalizeRole(body.role),
        isActive: body.isActive === false ? false : true
      }
    });
    sendJson(res, 200, { success: true, data: payload.data });
    return;
  }

  if (req.method === "PUT") {
    const body = await readBody(req);
    if (!body.id) {
      sendJson(res, 400, { success: false, error: "User ID is required" });
      return;
    }
    const user = { id: String(body.id) };
    if (body.displayName !== undefined) user.displayName = String(body.displayName).trim();
    if (body.password) user.password = body.password;
    if (body.role !== undefined) user.role = normalizeRole(body.role);
    if (body.isActive !== undefined) user.isActive = Boolean(body.isActive);
    const payload = await callScriptPost("updateUser", { user });
    sendJson(res, 200, { success: true, data: payload.data });
    return;
  }

  sendJson(res, 405, { success: false, error: "Method not allowed" });
}

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
