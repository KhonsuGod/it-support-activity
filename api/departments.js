const { callScriptGet, handleError, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    sendJson(res, 405, { success: false, error: "Method not allowed" });
    return;
  }
  try {
    const payload = await callScriptGet("departments");
    sendJson(res, 200, payload);
  } catch (error) {
    handleError(res, error);
  }
};
