const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec";

function getScriptUrl() {
  return process.env.APPS_SCRIPT_URL || DEFAULT_APPS_SCRIPT_URL;
}

function getApiSecret() {
  return process.env.APPS_SCRIPT_API_SECRET || "";
}

function sendJson(res, statusCode, payload) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 1024 * 1024) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

async function callScriptGet(action, params = {}) {
  const url = new URL(getScriptUrl());
  url.searchParams.set("action", action);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") url.searchParams.set(key, value);
  });
  return callFetch(url.toString(), { method: "GET" });
}

async function callScriptPost(action, payload = {}) {
  const apiSecret = getApiSecret();
  if (!apiSecret) throw new Error("APPS_SCRIPT_API_SECRET is not configured");
  return callFetch(getScriptUrl(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({}, payload, { action, apiSecret }))
  });
}

async function callFetch(url, options) {
  const response = await fetch(url, options);
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch (error) {
    throw new Error("Apps Script returned non-JSON response");
  }
  if (!response.ok || !payload.success) {
    throw new Error(payload.error || "Apps Script request failed");
  }
  return payload;
}

function pickFilters(query) {
  const filters = {};
  ["date", "dateFrom", "dateTo", "itStaff", "shift", "plant", "department", "area", "supportMode", "category", "status"].forEach((key) => {
    if (query[key]) filters[key] = String(query[key]);
  });
  return filters;
}

function handleError(res, error) {
  sendJson(res, 500, { success: false, error: error.message || "Unexpected server error" });
}

module.exports = {
  callScriptGet,
  callScriptPost,
  handleError,
  pickFilters,
  readBody,
  sendJson
};
