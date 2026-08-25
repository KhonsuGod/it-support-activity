const { authenticate, createToken, requireAuth } = require("./_auth");
const { readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const user = requireAuth(req);
      sendJson(res, 200, { success: true, data: { authenticated: true, user } });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const user = await authenticate(body.username, body.password);
      if (!user) {
        sendJson(res, 401, { success: false, error: "Username atau password salah" });
        return;
      }
      sendJson(res, 200, { success: true, data: { token: createToken(user), user } });
      return;
    }

    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { success: false, error: error.message || "Auth failed" });
  }
};
