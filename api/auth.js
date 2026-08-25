const { createToken, requireAuth, validatePassword } = require("./_auth");
const { readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      requireAuth(req);
      sendJson(res, 200, { success: true, data: { authenticated: true } });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      if (!validatePassword(body.password)) {
        sendJson(res, 401, { success: false, error: "Password salah" });
        return;
      }
      sendJson(res, 200, { success: true, data: { token: createToken() } });
      return;
    }

    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { success: false, error: error.message || "Auth failed" });
  }
};
