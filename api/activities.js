const { callScriptPost, handleError, pickFilters, readBody, sendJson } = require("./_google");
const { requireAuth } = require("./_auth");

module.exports = async function handler(req, res) {
  try {
    requireAuth(req);

    if (req.method === "GET") {
      let payload;
      try {
        payload = await callScriptPost("activities", { filters: pickFilters(req.query || {}) });
      } catch (error) {
        if (error.code === "APPS_SCRIPT_DOPOST_MISSING") {
          sendJson(res, 200, {
            success: true,
            data: [],
            warning: "Apps Script backend v2 belum dideploy, jadi activity spreadsheet belum bisa dibaca."
          });
          return;
        }
        throw error;
      }
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
