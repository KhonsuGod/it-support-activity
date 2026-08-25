const SPREADSHEET_ID = "1ShfPRzqtuWLdW8_IZdTXLDhvoc7Tx5Pid4O6IkDd4Mo";
const TIMEZONE = "Asia/Jakarta";
const API_SECRET_PROPERTY = "APPS_SCRIPT_API_SECRET";

const SHEETS = {
  ACTIVITIES: "Activities",
  MASTER: "Master_Data",
  STAFF: "IT_Staff",
  DEPARTMENTS: "Department_Mapping"
};

const ACTIVITY_HEADERS = [
  "ID",
  "Date",
  "IT Staff",
  "Shift",
  "Plant",
  "Department",
  "Area / Sub Department",
  "User",
  "Location",
  "Asset Name",
  "Device Type",
  "Category",
  "Activity Type",
  "Problem",
  "Action Taken",
  "Support Mode",
  "Production Impact",
  "Priority",
  "Report Time",
  "Start Time",
  "Finish Time",
  "Response Time",
  "Resolution Time",
  "Root Cause Category",
  "Root Cause Detail",
  "Status",
  "Notes",
  "Created At",
  "Updated At"
];

const HEADER_TO_KEY = {
  "ID": "id",
  "Date": "date",
  "IT Staff": "itStaff",
  "Shift": "shift",
  "Plant": "plant",
  "Department": "department",
  "Area / Sub Department": "area",
  "User": "user",
  "Location": "location",
  "Asset Name": "assetName",
  "Device Type": "deviceType",
  "Category": "category",
  "Activity Type": "activityType",
  "Problem": "problem",
  "Action Taken": "actionTaken",
  "Support Mode": "supportMode",
  "Production Impact": "productionImpact",
  "Priority": "priority",
  "Report Time": "reportTime",
  "Start Time": "startTime",
  "Finish Time": "finishTime",
  "Response Time": "responseTime",
  "Resolution Time": "resolutionTime",
  "Root Cause Category": "rootCauseCategory",
  "Root Cause Detail": "rootCauseDetail",
  "Status": "status",
  "Notes": "notes",
  "Created At": "createdAt",
  "Updated At": "updatedAt"
};

const DEFAULT_MASTER = {
  plant: ["Tigaraksa (Bolang)", "Jatiuwung (Jati)"],
  shift: ["Morning", "Evening", "Night"],
  department: ["HRD - GA", "GMO (IT)", "FINANCE", "ACCOUNTING", "MAINTENANCE", "SPAREPART", "MARKETING", "PURCHASING", "PRODUKSI", "QC", "QA", "PPIC", "RND", "WAREHOUSE", "PRINTING", "WORKSHOP", "POS SECURITY"],
  activityType: ["Incident", "Service Request", "Preventive Maintenance", "Routine Check", "Installation / Setup", "Inventory", "Administration", "Other"],
  supportMode: ["On-Site", "Remote", "Hybrid", "N/A"],
  productionImpact: ["No Impact", "Low", "Medium", "High", "Production Stop"],
  priority: ["Low", "Medium", "High", "Critical"],
  status: ["Resolved", "In Progress", "Pending"],
  deviceType: ["PC", "Laptop", "Printer", "Label Printer", "Scanner", "Barcode Scanner", "Monitor", "Network Device", "Server", "CCTV", "Access Point", "Switch", "Router", "Peripheral", "Software / Application", "Other"],
  category: ["PC / Laptop", "Printer", "Network", "Scanner / Barcode", "Software / Application", "Server", "CCTV", "Account / User", "Peripheral", "Preventive Maintenance", "Inventory", "Other"],
  rootCauseCategory: ["Hardware", "Software", "Network", "Configuration", "Consumable", "User Operation", "Power", "Infrastructure", "Unknown", "Other"],
  role: ["IT Support", "IT PIC", "IT Supervisor", "IT Admin"],
  staffStatus: ["Active", "Inactive"]
};

const DEFAULT_STAFF = [
  { id: "IT-001", name: "Jumali", primaryPlant: "Jatiuwung (Jati)", coverage: "Jatiuwung (Jati)", role: "IT Support", isPIC: "No", status: "Active", notes: "Primary support: Plant Jati" },
  { id: "IT-002", name: "Davi", primaryPlant: "Tigaraksa (Bolang)", coverage: "Tigaraksa (Bolang)", role: "IT Support", isPIC: "No", status: "Active", notes: "Primary support: Plant Bolang" },
  { id: "IT-003", name: "Naufal", primaryPlant: "Tigaraksa (Bolang)", coverage: "Tigaraksa (Bolang)", role: "IT Support", isPIC: "No", status: "Active", notes: "Primary support: Plant Bolang" },
  { id: "IT-004", name: "Henri", primaryPlant: "Jatiuwung (Jati)", coverage: "Jatiuwung (Jati)", role: "IT Support", isPIC: "No", status: "Active", notes: "Primary support: Plant Jati" },
  { id: "IT-005", name: "Haris", primaryPlant: "Tigaraksa (Bolang)", coverage: "Tigaraksa (Bolang) + Jatiuwung (Jati) / Mobile", role: "IT PIC", isPIC: "Yes", status: "Active", notes: "PIC Plant Bolang; mobile support to Plant Jati when needed; coordination/confirmation to superior at Jati." }
];

const DEFAULT_DEPARTMENT_MAPPING = {
  "HRD - GA": [],
  "GMO (IT)": [],
  "FINANCE": [],
  "ACCOUNTING": [],
  "MAINTENANCE": [],
  "SPAREPART": [],
  "MARKETING": [],
  "PURCHASING": [],
  "PRODUKSI": ["EXTRUDER", "CRUSHER", "BARCODE", "PROSES 1", "PROSES 2", "ADMIN", "PM", "ADMIN CMS"],
  "QC": [],
  "QA": [],
  "PPIC": [],
  "RND": [],
  "WAREHOUSE": ["WH SCAN IN", "WH SCAN OUT", "BAHAN BAKU"],
  "PRINTING": [],
  "WORKSHOP": [],
  "POS SECURITY": []
};

function doGet(e) {
  try {
    const action = String((e.parameter && e.parameter.action) || "status");
    if (action === "status") return jsonResponse({ success: true, data: getStatus() });
    if (action === "staff") return jsonResponse({ success: true, data: getStaff() });
    if (action === "master") return jsonResponse({ success: true, data: getMasterData() });
    if (action === "departments") return jsonResponse({ success: true, data: getDepartmentMapping() });
    return jsonResponse({ success: false, error: "Unknown action" }, 404);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

function doPost(e) {
  try {
    const body = parsePostBody(e);
    requireSecret(body);
    const action = String(body.action || "");
    if (action === "setup") return jsonResponse({ success: true, data: setupSpreadsheetConfiguration() });
    if (action === "timezoneCheck") return jsonResponse({ success: true, data: verifyTimezoneDateWrite() });
    if (action === "activities") return jsonResponse({ success: true, data: getActivities(body.filters || {}) });
    if (action === "createActivity") return jsonResponse({ success: true, data: createActivity(body.activity || {}) });
    if (action === "updateActivity") return jsonResponse({ success: true, data: updateActivity(body.activity || {}) });
    if (action === "deleteActivity") return jsonResponse({ success: true, data: deleteActivity(body.id || "") });
    return jsonResponse({ success: false, error: "Unknown write action" }, 404);
  } catch (error) {
    return jsonResponse({ success: false, error: error.message }, 500);
  }
}

function getStatus() {
  const ss = getSpreadsheet();
  return {
    api: "IT Support Daily Activity API",
    status: "online",
    version: "2.0",
    timezone: TIMEZONE,
    spreadsheetTimezone: ss.getSpreadsheetTimeZone(),
    availableEndpoints: ["?action=status", "?action=staff", "?action=master", "?action=departments"]
  };
}

function createActivity(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const ss = getSpreadsheet();
    const sheet = getSheet(SHEETS.ACTIVITIES);
    ensureActivitiesHeader(sheet);
    const headerMap = getHeaderMap(sheet);
    const activity = normalizeActivityInput(input);
    validateActivity(activity);

    const dateObj = parseDateOnly(activity.date);
    activity.date = dateObj;
    activity.responseTime = durationBetween(activity.reportTime, activity.startTime);
    activity.resolutionTime = durationBetween(activity.startTime, activity.finishTime);
    activity.id = generateActivityId(sheet, headerMap, dateObj);
    const now = new Date();
    activity.createdAt = now;
    activity.updatedAt = now;

    const row = getNextActivityRow(sheet);
    writeActivityRow(sheet, headerMap, row, activity);
    formatActivityRow(sheet, headerMap, row);
    return serializeActivity(readRowObject(sheet, headerMap, row));
  } finally {
    lock.releaseLock();
  }
}

function updateActivity(input) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    const sheet = getSheet(SHEETS.ACTIVITIES);
    ensureActivitiesHeader(sheet);
    const headerMap = getHeaderMap(sheet);
    const id = String(input.id || "").trim();
    if (!id) throw new Error("ID is required");
    const row = findActivityRowById(sheet, headerMap, id);
    if (!row) throw new Error("Activity not found: " + id);

    const current = readRowObject(sheet, headerMap, row);
    const activity = normalizeActivityInput(input);
    validateActivity(activity);
    activity.id = id;
    activity.date = parseDateOnly(activity.date);
    activity.responseTime = durationBetween(activity.reportTime, activity.startTime);
    activity.resolutionTime = durationBetween(activity.startTime, activity.finishTime);
    activity.createdAt = current.createdAt || "";
    activity.updatedAt = new Date();

    writeActivityRow(sheet, headerMap, row, activity);
    formatActivityRow(sheet, headerMap, row);
    return serializeActivity(readRowObject(sheet, headerMap, row));
  } finally {
    lock.releaseLock();
  }
}

function deleteActivity(id) {
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    id = String(id || "").trim();
    if (!id) throw new Error("ID is required");
    const sheet = getSheet(SHEETS.ACTIVITIES);
    const headerMap = getHeaderMap(sheet);
    const row = findActivityRowById(sheet, headerMap, id);
    if (!row) throw new Error("Activity not found: " + id);
    sheet.deleteRow(row);
    return { id: id, deleted: true };
  } finally {
    lock.releaseLock();
  }
}

function getActivities(filters) {
  const sheet = getSheet(SHEETS.ACTIVITIES);
  ensureActivitiesHeader(sheet);
  const headerMap = getHeaderMap(sheet);
  const lastRow = getLastDataRowById(sheet, headerMap);
  if (lastRow < 2) return [];
  const values = sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).getValues();
  return values
    .map(function(rowValues) {
      return serializeActivity(rowToObject(rowValues, headerMap));
    })
    .filter(function(item) {
      return item.id;
    })
    .filter(function(item) {
      return matchesFilters(item, filters || {});
    })
    .sort(function(a, b) {
      return String(b.date).localeCompare(String(a.date)) || String(b.id).localeCompare(String(a.id));
    });
}

function validateActivity(activity) {
  const required = ["date", "itStaff", "shift", "plant", "department", "activityType", "problem", "actionTaken", "supportMode", "status"];
  required.forEach(function(key) {
    if (!String(activity[key] || "").trim()) throw new Error(key + " is required");
  });
  parseDateOnly(activity.date);
  const master = getMasterData();
  const staffNames = getStaff().filter(function(item) { return item.status !== "Inactive"; }).map(function(item) { return item.name; });
  assertOption("IT Staff", activity.itStaff, staffNames);
  assertOption("Shift", activity.shift, master.shift);
  assertOption("Plant", activity.plant, master.plant);
  assertOption("Department", activity.department, master.department);
  assertOption("Activity Type", activity.activityType, master.activityType);
  assertOption("Support Mode", activity.supportMode, master.supportMode);
  assertOption("Status", activity.status, master.status);
  if (activity.productionImpact) assertOption("Production Impact", activity.productionImpact, master.productionImpact);
  if (activity.priority) assertOption("Priority", activity.priority, master.priority);
  if (activity.deviceType) assertOption("Device Type", activity.deviceType, master.deviceType);
  if (activity.category) assertOption("Category", activity.category, master.category);
  if (activity.rootCauseCategory) assertOption("Root Cause Category", activity.rootCauseCategory, master.rootCauseCategory);

  const mapping = getDepartmentMapping();
  const allowedAreas = mapping[activity.department] || [];
  if (allowedAreas.length && activity.area) assertOption("Area / Sub Department", activity.area, allowedAreas);
}

function assertOption(label, value, options) {
  if (!options || !options.length) return;
  if (options.indexOf(value) === -1) throw new Error(label + " is not valid: " + value);
}

function normalizeActivityInput(input) {
  const normalized = {};
  Object.keys(HEADER_TO_KEY).forEach(function(header) {
    const key = HEADER_TO_KEY[header];
    normalized[key] = trimString(input[key] !== undefined ? input[key] : input[header]);
  });
  return normalized;
}

function writeActivityRow(sheet, headerMap, row, activity) {
  const values = ACTIVITY_HEADERS.map(function(header) {
    const key = HEADER_TO_KEY[header];
    return activity[key] !== undefined ? activity[key] : "";
  });
  sheet.getRange(row, 1, 1, ACTIVITY_HEADERS.length).setValues([values]);
}

function formatActivityRow(sheet, headerMap, row) {
  sheet.getRange(row, headerMap["Date"]).setNumberFormat("dd/MM/yyyy");
  sheet.getRange(row, headerMap["Created At"]).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  sheet.getRange(row, headerMap["Updated At"]).setNumberFormat("dd/MM/yyyy HH:mm:ss");
}

function generateActivityId(sheet, headerMap, dateObj) {
  const dateKey = Utilities.formatDate(dateObj, TIMEZONE, "yyyyMMdd");
  const prefix = "ACT-" + dateKey + "-";
  const lastRow = Math.max(sheet.getLastRow(), 2);
  const idCol = headerMap["ID"];
  let max = 0;
  if (lastRow >= 2) {
    const values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
    values.forEach(function(row) {
      const value = String(row[0] || "");
      if (value.indexOf(prefix) === 0) {
        const number = parseInt(value.slice(prefix.length), 10);
        if (!isNaN(number) && number > max) max = number;
      }
    });
  }
  return prefix + String(max + 1).padStart(3, "0");
}

function getNextActivityRow(sheet) {
  const maxRows = Math.max(sheet.getMaxRows(), 2);
  const values = sheet.getRange(2, 1, maxRows - 1, ACTIVITY_HEADERS.length).getValues();
  for (let index = 0; index < values.length; index++) {
    const empty = values[index].every(function(value) {
      return value === "" || value === null;
    });
    if (empty) return index + 2;
  }
  sheet.insertRowAfter(maxRows);
  return maxRows + 1;
}

function getLastDataRowById(sheet, headerMap) {
  const idCol = headerMap["ID"];
  const maxRows = Math.max(sheet.getMaxRows(), 2);
  const values = sheet.getRange(2, idCol, maxRows - 1, 1).getValues();
  for (let index = values.length - 1; index >= 0; index--) {
    if (String(values[index][0] || "").trim()) return index + 2;
  }
  return 1;
}

function findActivityRowById(sheet, headerMap, id) {
  const idCol = headerMap["ID"];
  const lastRow = getLastDataRowById(sheet, headerMap);
  if (lastRow < 2) return null;
  const values = sheet.getRange(2, idCol, lastRow - 1, 1).getValues();
  for (let index = 0; index < values.length; index++) {
    if (String(values[index][0] || "").trim() === id) return index + 2;
  }
  return null;
}

function readRowObject(sheet, headerMap, row) {
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowToObject(values, headerMap);
}

function rowToObject(rowValues, headerMap) {
  const obj = {};
  Object.keys(headerMap).forEach(function(header) {
    const key = HEADER_TO_KEY[header] || toCamelCase(header);
    obj[key] = rowValues[headerMap[header] - 1];
  });
  return obj;
}

function serializeActivity(item) {
  const output = {};
  Object.keys(HEADER_TO_KEY).forEach(function(header) {
    const key = HEADER_TO_KEY[header];
    let value = item[key];
    if (header === "Date") value = value instanceof Date ? Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd") : normalizeDateString(value);
    if (header === "Created At" || header === "Updated At") value = value instanceof Date ? Utilities.formatDate(value, TIMEZONE, "dd/MM/yyyy HH:mm:ss") : String(value || "");
    if (["Report Time", "Start Time", "Finish Time", "Response Time", "Resolution Time"].indexOf(header) !== -1) value = normalizeTime(value);
    output[key] = value === undefined || value === null ? "" : String(value);
  });
  return output;
}

function matchesFilters(item, filters) {
  if (filters.date && item.date !== filters.date) return false;
  if (filters.dateFrom && item.date < filters.dateFrom) return false;
  if (filters.dateTo && item.date > filters.dateTo) return false;
  const keys = ["itStaff", "shift", "plant", "department", "area", "supportMode", "category", "status"];
  for (let index = 0; index < keys.length; index++) {
    const key = keys[index];
    if (filters[key] && item[key] !== filters[key]) return false;
  }
  return true;
}

function durationBetween(start, finish) {
  if (!start || !finish) return "";
  const startMinutes = parseTimeToMinutes(start);
  let finishMinutes = parseTimeToMinutes(finish);
  if (startMinutes === null || finishMinutes === null) return "";
  if (finishMinutes < startMinutes) finishMinutes += 24 * 60;
  const diff = finishMinutes - startMinutes;
  return String(Math.floor(diff / 60)).padStart(2, "0") + ":" + String(diff % 60).padStart(2, "0");
}

function parseTimeToMinutes(value) {
  value = normalizeTime(value);
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

function normalizeTime(value) {
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, "HH:mm");
  if (typeof value === "number") {
    const totalMinutes = Math.round(value * 24 * 60);
    return String(Math.floor(totalMinutes / 60) % 24).padStart(2, "0") + ":" + String(totalMinutes % 60).padStart(2, "0");
  }
  const text = String(value || "").trim();
  const match = text.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  return match ? match[1].padStart(2, "0") + ":" + match[2] : text;
}

function parseDateOnly(value) {
  if (value instanceof Date) return new Date(value.getFullYear(), value.getMonth(), value.getDate());
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) return new Date(Number(match[3]), Number(match[2]) - 1, Number(match[1]));
  throw new Error("Date must be YYYY-MM-DD");
}

function normalizeDateString(value) {
  if (!value) return "";
  if (value instanceof Date) return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd");
  const parsed = parseDateOnly(value);
  return Utilities.formatDate(parsed, TIMEZONE, "yyyy-MM-dd");
}

function getMasterData() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.MASTER);
  if (!sheet || sheet.getLastRow() < 2) return DEFAULT_MASTER;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value || "").trim(); });
  const hasTypeValue = headers.indexOf("Type") !== -1 && headers.indexOf("Value") !== -1;
  const master = JSON.parse(JSON.stringify(DEFAULT_MASTER));

  if (hasTypeValue) {
    const typeCol = headers.indexOf("Type");
    const valueCol = headers.indexOf("Value");
    values.slice(1).forEach(function(row) {
      const type = toCamelCase(row[typeCol]);
      const value = trimString(row[valueCol]);
      if (!type || !value) return;
      if (!master[type]) master[type] = [];
      if (master[type].indexOf(value) === -1) master[type].push(value);
    });
    return master;
  }

  headers.forEach(function(header, colIndex) {
    const key = toCamelCase(header);
    if (!key) return;
    const options = values.slice(1).map(function(row) { return trimString(row[colIndex]); }).filter(Boolean);
    if (options.length) master[key] = unique(options);
  });
  return master;
}

function getStaff() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.STAFF);
  if (!sheet || sheet.getLastRow() < 2) return DEFAULT_STAFF;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value || "").trim(); });
  const rows = values.slice(1).map(function(row) {
    return {
      id: cellByHeader(row, headers, ["ID", "Staff ID"]),
      name: cellByHeader(row, headers, ["Name", "IT Staff", "Staff"]),
      primaryPlant: cellByHeader(row, headers, ["Primary Plant", "Plant"]),
      coverage: cellByHeader(row, headers, ["Coverage"]),
      role: cellByHeader(row, headers, ["Role"]),
      isPIC: cellByHeader(row, headers, ["Is PIC", "PIC"]),
      status: cellByHeader(row, headers, ["Status"]) || "Active",
      notes: cellByHeader(row, headers, ["Notes"])
    };
  }).filter(function(item) {
    return item.name;
  });
  return rows.length ? rows : DEFAULT_STAFF;
}

function getDepartmentMapping() {
  const mapping = JSON.parse(JSON.stringify(DEFAULT_DEPARTMENT_MAPPING));
  const sheet = getSpreadsheet().getSheetByName(SHEETS.DEPARTMENTS);
  if (!sheet || sheet.getLastRow() < 2) return mapping;
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(value) { return String(value || "").trim(); });
  const departmentCol = findHeaderIndex(headers, ["Department"]);
  const areaCol = findHeaderIndex(headers, ["Area / Sub Department", "Area", "Sub Department"]);
  if (departmentCol === -1) return mapping;
  values.slice(1).forEach(function(row) {
    const department = trimString(row[departmentCol]);
    const area = areaCol === -1 ? "" : trimString(row[areaCol]);
    if (!department) return;
    if (!mapping[department]) mapping[department] = [];
    if (area && mapping[department].indexOf(area) === -1) mapping[department].push(area);
  });
  return mapping;
}

function ensureActivitiesHeader(sheet) {
  const current = sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).getValues()[0];
  const hasHeaders = current.some(function(value) { return String(value || "").trim(); });
  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
    sheet.setFrozenRows(1);
    return;
  }
  ACTIVITY_HEADERS.forEach(function(header, index) {
    if (String(current[index] || "").trim() !== header && String(current[index] || "").trim() === "") {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach(function(header, index) {
    const name = String(header || "").trim();
    if (name) map[name] = index + 1;
  });
  ACTIVITY_HEADERS.forEach(function(header) {
    if (!map[header]) throw new Error("Missing Activities header: " + header);
  });
  return map;
}

function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function getSheet(name) {
  const sheet = getSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error("Missing sheet: " + name);
  return sheet;
}

function parsePostBody(e) {
  if (!e || !e.postData || !e.postData.contents) return {};
  return JSON.parse(e.postData.contents);
}

function requireSecret(body) {
  const expected = PropertiesService.getScriptProperties().getProperty(API_SECRET_PROPERTY);
  if (!expected) throw new Error("Script property APPS_SCRIPT_API_SECRET is not configured");
  if (!body || body.apiSecret !== expected) throw new Error("Unauthorized");
}

function jsonResponse(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function setApiSecret(secret) {
  if (!secret) throw new Error("Secret is required");
  PropertiesService.getScriptProperties().setProperty(API_SECRET_PROPERTY, String(secret));
}

function setupSpreadsheetConfiguration() {
  setSpreadsheetTimeZone(TIMEZONE);
  const sheet = getSheet(SHEETS.ACTIVITIES);
  sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
  sheet.setFrozenRows(1);
  formatActivitiesSheet(sheet);
  return getStatus();
}

function setSpreadsheetTimeZone(timezone) {
  const tz = timezone || TIMEZONE;
  getSpreadsheet().setSpreadsheetTimeZone(tz);
  return { spreadsheetTimezone: getSpreadsheet().getSpreadsheetTimeZone(), scriptTimezone: Session.getScriptTimeZone() };
}

function formatActivitiesSheet(sheet) {
  const headerMap = getHeaderMap(sheet);
  sheet.getRange(2, headerMap["Date"], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("dd/MM/yyyy");
  sheet.getRange(2, headerMap["Created At"], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
  sheet.getRange(2, headerMap["Updated At"], Math.max(sheet.getMaxRows() - 1, 1), 1).setNumberFormat("dd/MM/yyyy HH:mm:ss");
}

function verifyTimezoneDateWrite() {
  const date = parseDateOnly("2026-08-25");
  return {
    input: "2026-08-25",
    formatted: Utilities.formatDate(date, TIMEZONE, "dd/MM/yyyy"),
    expected: "25/08/2026",
    spreadsheetTimezone: getSpreadsheet().getSpreadsheetTimeZone(),
    scriptTimezone: Session.getScriptTimeZone()
  };
}

function cellByHeader(row, headers, names) {
  const index = findHeaderIndex(headers, names);
  return index === -1 ? "" : trimString(row[index]);
}

function findHeaderIndex(headers, names) {
  for (let i = 0; i < names.length; i++) {
    const index = headers.indexOf(names[i]);
    if (index !== -1) return index;
  }
  return -1;
}

function trimString(value) {
  return value === undefined || value === null ? "" : String(value).trim();
}

function unique(values) {
  const output = [];
  values.forEach(function(value) {
    if (output.indexOf(value) === -1) output.push(value);
  });
  return output;
}

function toCamelCase(value) {
  return String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9]+(.)/g, function(match, chr) { return chr.toUpperCase(); })
    .replace(/^[A-Z]/, function(chr) { return chr.toLowerCase(); });
}
