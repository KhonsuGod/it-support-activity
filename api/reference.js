const { requireAdmin } = require("./_auth");
const { callScriptPost, readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    requireAdmin(req);
    if (req.method !== "POST" && req.method !== "DELETE") {
      sendJson(res, 405, { success: false, error: "Method not allowed" });
      return;
    }

    const body = req.method === "DELETE" ? req.query : await readBody(req);
    const option = normalizeOption(body);
    const action = req.method === "POST" ? "addReferenceOption" : "deleteReferenceOption";
    const payload = await callScriptPost(action, { option });
    sendJson(res, 200, { success: true, data: payload.data });
  } catch (error) {
    sendJson(res, error.statusCode || 500, { success: false, error: error.message || "Reference API failed" });
  }
};

function normalizeOption(body) {
  const type = String(body.type || "").trim();
  const value = String(body.value || "").trim();
  const department = String(body.department || "").trim();
  if (type !== "department" && type !== "area") throw badRequest("Reference type must be department or area");
  if (!value) throw badRequest("Reference value is required");
  if (type === "area" && !department) throw badRequest("Department is required");
  return { type, value, department };
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}
