const { callScriptPost, handleError, pickFilters, readBody, sendJson } = require("./_google");

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const payload = await callScriptPost("activities", { filters: pickFilters(req.query || {}) });
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const payload = await callScriptPost("createActivity", { activity: body });
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "PUT") {
      const body = await readBody(req);
      const payload = await callScriptPost("updateActivity", { activity: body });
      sendJson(res, 200, payload);
      return;
    }

    if (req.method === "DELETE") {
      const id = req.query && req.query.id ? String(req.query.id) : "";
      const payload = await callScriptPost("deleteActivity", { id });
      sendJson(res, 200, payload);
      return;
    }

    sendJson(res, 405, { success: false, error: "Method not allowed" });
  } catch (error) {
    handleError(res, error);
  }
};
