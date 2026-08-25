const fs = require("node:fs");
const assert = require("node:assert/strict");

const SCRIPT_URL = process.env.APPS_SCRIPT_URL || "https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec";

function durationBetween(start, finish) {
  const parse = (value) => {
    const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  };
  const startMinutes = parse(start);
  let finishMinutes = parse(finish);
  if (startMinutes === null || finishMinutes === null) return "";
  if (finishMinutes < startMinutes) finishMinutes += 24 * 60;
  const diff = finishMinutes - startMinutes;
  return String(Math.floor(diff / 60)).padStart(2, "0") + ":" + String(diff % 60).padStart(2, "0");
}

async function get(action) {
  const response = await fetch(`${SCRIPT_URL}?action=${encodeURIComponent(action)}`);
  const payload = await response.json();
  assert.equal(payload.success, true, `${action} should return success`);
  return payload.data;
}

(async () => {
  JSON.parse(fs.readFileSync("package.json", "utf8"));
  JSON.parse(fs.readFileSync("vercel.json", "utf8"));
  const manifest = JSON.parse(fs.readFileSync("apps-script/appsscript.json", "utf8"));
  assert.equal(manifest.timeZone, "Asia/Jakarta");

  const html = fs.readFileSync("index.html", "utf8");
  assert.match(html, /assets\/styles\.css/);
  assert.match(html, /assets\/app\.js/);
  assert.equal(fs.existsSync("assets/styles.css"), true);
  assert.equal(fs.existsSync("assets/app.js"), true);

  const script = fs.readFileSync("apps-script/Code.js", "utf8");
  assert.match(script, /const TIMEZONE = "Asia\/Jakarta"/);
  assert.match(script, /setSpreadsheetTimeZone/);
  assert.match(script, /LockService\.getScriptLock/);
  assert.match(script, /getNextActivityRow/);

  process.env.APP_SESSION_SECRET = "test-session-secret";
  const auth = require("../api/_auth");
  const password = require("../api/_password");
  const hash = await password.hashPassword("test-login-password");
  assert.equal(await password.verifyPassword("test-login-password", hash), true);
  assert.equal(await password.verifyPassword("wrong", hash), false);
  const token = auth.createToken({ id: 1, username: "haris", displayName: "Haris", role: "admin" });
  assert.equal(auth.verifyToken(token).role, "admin");
  assert.equal(auth.verifyToken("bad.token"), null);

  const activitiesHandler = require("../api/activities");
  const unauthorized = await new Promise((resolve) => {
    const req = { method: "GET", query: {}, headers: {}, on() {} };
    const res = {
      statusCode: 200,
      setHeader() {},
      end(chunk) {
        resolve({ statusCode: this.statusCode, payload: JSON.parse(chunk) });
      }
    };
    activitiesHandler(req, res);
  });
  assert.equal(unauthorized.statusCode, 401);
  assert.equal(unauthorized.payload.success, false);

  assert.equal(durationBetween("22:30", "22:35"), "00:05");
  assert.equal(durationBetween("22:35", "22:50"), "00:15");
  assert.equal(durationBetween("23:50", "00:15"), "00:25");

  const status = await get("status");
  assert.equal(status.status, "online");

  const staff = await get("staff");
  ["Jumali", "Davi", "Naufal", "Henri", "Haris"].forEach((name) => {
    assert.equal(staff.some((item) => item.name === name), true, `missing staff ${name}`);
  });

  const master = await get("master");
  assert.deepEqual(master.shift, ["Morning", "Evening", "Night"]);
  assert.equal(master.plant.includes("Tigaraksa (Bolang)"), true);
  assert.equal(master.plant.includes("Jatiuwung (Jati)"), true);

  const departments = await get("departments");
  assert.deepEqual(departments.PRODUKSI, ["EXTRUDER", "CRUSHER", "BARCODE", "PROSES 1", "PROSES 2", "ADMIN", "PM", "ADMIN CMS"]);
  assert.deepEqual(departments.WAREHOUSE, ["WH SCAN IN", "WH SCAN OUT", "BAHAN BAKU"]);

  console.log("LOCAL VERIFICATION PASS");
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
