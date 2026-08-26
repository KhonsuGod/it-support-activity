const DEFAULT_APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec";

function getScriptUrl() {
  return stripWrappingQuotes(process.env.APPS_SCRIPT_URL) || DEFAULT_APPS_SCRIPT_URL;
}

function getApiSecret() {
  return stripWrappingQuotes(process.env.APPS_SCRIPT_API_SECRET) || "";
}

function stripWrappingQuotes(value) {
  return String(value || "").trim().replace(/^["']|["']$/g, "");
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
  return callFetch(url.toString(), { method: "GET" }, action);
}

async function callScriptPost(action, payload = {}) {
  const apiSecret = getApiSecret();
  if (!apiSecret) throw new Error("APPS_SCRIPT_API_SECRET is not configured");
  return callFetch(getScriptUrl(), {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(Object.assign({}, payload, { action, apiSecret }))
  }, action);
}

async function callFetch(url, options, action) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, options);
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch (error) {
        throw appsScriptResponseError(text, action);
      }
      if (isLostPostPayload(options, action, payload)) {
        throw appsScriptResponseError("Unexpected status payload from Apps Script POST", action);
      }
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || "Apps Script request failed");
      }
      return payload;
    } catch (error) {
      lastError = error;
      if (!shouldRetryAppsScript(error, attempt)) throw error;
      await delay(350 * attempt);
    }
  }
  throw lastError;
}

function isLostPostPayload(options, action, payload) {
  return options && options.method === "POST" && action !== "status" && payload && payload.data && payload.data.api === "IT Support Daily Activity API";
}

function shouldRetryAppsScript(error, attempt) {
  if (attempt >= 3) return false;
  return error && (error.code === "APPS_SCRIPT_INVALID_RESPONSE" || error.code === "APPS_SCRIPT_LOST_POST_PAYLOAD" || /fetch failed/i.test(error.message || ""));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function appsScriptResponseError(text, action) {
  const lowerText = String(text || "").toLowerCase();
  let message = "Apps Script returned an invalid response";
  if (lowerText.includes("dopost") && lowerText.includes("tidak ditemukan")) {
    message = "Apps Script backend v2 belum dideploy: function doPost belum ada di deployment existing.";
  } else if (lowerText.includes("script function not found") && lowerText.includes("dopost")) {
    message = "Apps Script backend v2 belum dideploy: function doPost belum ada di deployment existing.";
  } else if (lowerText.includes("<!doctype html") || lowerText.includes("<html")) {
    message = "Apps Script mengembalikan halaman HTML, bukan JSON. Cek deployment Web App dan permission Apps Script.";
  } else if (lowerText.includes("unexpected status payload")) {
    message = "Apps Script POST kehilangan payload dan mengembalikan status, request diulang.";
  }
  if (action) message += " Action: " + action + ".";
  const error = new Error(message);
  error.statusCode = 502;
  error.code = lowerText.includes("unexpected status payload")
    ? "APPS_SCRIPT_LOST_POST_PAYLOAD"
    : lowerText.includes("dopost") ? "APPS_SCRIPT_DOPOST_MISSING" : "APPS_SCRIPT_INVALID_RESPONSE";
  return error;
}

function pickFilters(query) {
  const filters = {};
  ["date", "dateFrom", "dateTo", "itStaff", "shift", "plant", "department", "area", "supportMode", "category", "status"].forEach((key) => {
    if (query[key]) filters[key] = String(query[key]);
  });
  return filters;
}

function handleError(res, error) {
  sendJson(res, error.statusCode || 500, { success: false, error: error.message || "Unexpected server error" });
}

module.exports = {
  callScriptGet,
  callScriptPost,
  handleError,
  pickFilters,
  readBody,
  sendJson
};
