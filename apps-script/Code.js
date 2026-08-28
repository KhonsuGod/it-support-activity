const SPREADSHEET_ID = "1ShfPRzqtuWLdW8_IZdTXLDhvoc7Tx5Pid4O6IkDd4Mo";
const TIMEZONE = "Asia/Jakarta";
const API_SECRET_PROPERTY = "APPS_SCRIPT_API_SECRET";
const USER_STORE_PROPERTY = "IT_ACTIVITY_USERS";

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
  department: ["ALL DEPT", "HRD - GA", "GMO (IT)", "FINANCE", "ACCOUNTING", "MAINTENANCE", "SPAREPART", "MARKETING", "PURCHASING", "PRODUKSI", "QC", "QA", "PPIC", "RND", "WAREHOUSE", "PRINTING", "WORKSHOP", "HSE", "POS SECURITY"],
  activityType: ["Incident", "Service Request", "Preventive Maintenance", "Routine Check", "Installation / Setup", "Inventory", "Administration", "Refill Toner", "Service Toner", "Service Printer", "Cleaning Printer", "Pickup Broken Device", "Other"],
  supportMode: ["On-Site", "Remote", "Hybrid", "N/A"],
  productionImpact: ["No Impact", "Low", "Medium", "High", "Production Stop"],
  priority: ["Low", "Medium", "High", "Critical"],
  status: ["Resolved", "In Progress", "Pending"],
  deviceType: ["PC", "Laptop", "Printer", "Printer Zebra", "Printer Canon", "Printer Epson", "Label Printer", "Scanner", "Barcode Scanner", "Monitor", "Network Device", "Server", "CCTV", "Access Point", "Switch", "Router", "Peripheral", "Toner Cartridge", "Software / Application", "Other"],
  category: ["PC / Laptop", "Printer", "Printer Service", "Toner", "Network", "Scanner / Barcode", "Software / Application", "Server", "CCTV", "Account / User", "Peripheral", "Preventive Maintenance", "Inventory", "Broken Device", "Other"],
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
  "ALL DEPT": [],
  "HRD - GA": [],
  "GMO (IT)": [],
  "FINANCE": [],
  "ACCOUNTING": [],
  "MAINTENANCE": [],
  "SPAREPART": [],
  "MARKETING": [],
  "PURCHASING": [],
  "PRODUKSI": ["EXTRUDER", "CRUSHER", "BARCODE", "PROSES 1", "PROSES 2", "ADMIN", "PM", "PM1", "PM2", "ADMIN CMS"],
  "QC": [],
  "QA": [],
  "PPIC": [],
  "RND": [],
  "WAREHOUSE": ["WH SCAN IN", "WH SCAN OUT", "BAHAN BAKU", "OFFICE WAREHOUSE"],
  "PRINTING": [],
  "WORKSHOP": [],
  "HSE": [],
  "POS SECURITY": []
};

const OBSOLETE_DEPARTMENT_MAPPINGS = [
  { department: "WAREHOUSE", area: "PM1-PM2" }
];

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
    if (action === "authenticateUser") return jsonResponse({ success: true, data: authenticateUser(body.username, body.password) });
    if (action === "listUsers") return jsonResponse({ success: true, data: listStoredUsers() });
    if (action === "createUser") return jsonResponse({ success: true, data: createStoredUser(body.user || {}) });
    if (action === "updateUser") return jsonResponse({ success: true, data: updateStoredUser(body.user || {}) });
    if (action === "deleteUser") return jsonResponse({ success: true, data: deleteStoredUser(body.id || "") });
    if (action === "seedUsers") return jsonResponse({ success: true, data: seedStoredUsers(body.users || []) });
    if (action === "addReferenceOption") return jsonResponse({ success: true, data: addReferenceOption(body.option || {}) });
    if (action === "deleteReferenceOption") return jsonResponse({ success: true, data: deleteReferenceOption(body.option || {}) });
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
    if (options.length) master[key] = unique((master[key] || []).concat(options));
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

function authenticateUser(username, password) {
  const normalizedUsername = String(username || "").trim().toLowerCase();
  if (!normalizedUsername || !password) return null;
  const user = getStoredUsers().find(function(item) {
    return item.username === normalizedUsername && item.isActive !== false;
  });
  if (!user || !verifyStoredPassword(password, user.passwordHash)) return null;
  return serializeStoredUser(user);
}

function listStoredUsers() {
  return getStoredUsers().map(serializeStoredUser);
}

function createStoredUser(input) {
  const users = getStoredUsers();
  const username = String(input.username || "").trim().toLowerCase();
  if (!username) throw new Error("Username is required");
  if (!input.password) throw new Error("Password is required");
  const existing = users.find(function(item) { return item.username === username; });
  const user = {
    id: existing ? existing.id : getNextUserId(users),
    username: username,
    displayName: String(input.displayName || input.username || "").trim(),
    role: normalizeStoredRole(input.role),
    isActive: input.isActive === false ? false : true,
    passwordHash: hashStoredPassword(input.password),
    createdAt: existing ? existing.createdAt : nowTimestamp(),
    updatedAt: nowTimestamp()
  };
  if (existing) {
    users[users.indexOf(existing)] = user;
  } else {
    users.push(user);
  }
  saveStoredUsers(users);
  return serializeStoredUser(user);
}

function updateStoredUser(input) {
  const users = getStoredUsers();
  const id = String(input.id || "").trim();
  if (!id) throw new Error("User ID is required");
  const user = users.find(function(item) { return String(item.id) === id; });
  if (!user) throw new Error("User not found");
  if (input.displayName !== undefined) user.displayName = String(input.displayName || user.username).trim();
  if (input.role !== undefined) user.role = normalizeStoredRole(input.role);
  if (input.isActive !== undefined) user.isActive = Boolean(input.isActive);
  if (input.password) user.passwordHash = hashStoredPassword(input.password);
  user.updatedAt = nowTimestamp();
  ensureActiveAdmin(users);
  saveStoredUsers(users);
  return serializeStoredUser(user);
}

function deleteStoredUser(id) {
  const users = getStoredUsers();
  const normalizedId = String(id || "").trim();
  if (!normalizedId) throw new Error("User ID is required");
  const index = users.findIndex(function(item) { return String(item.id) === normalizedId; });
  if (index === -1) throw new Error("User not found");
  const removed = users.splice(index, 1)[0];
  ensureActiveAdmin(users);
  saveStoredUsers(users);
  return { deleted: true, user: serializeStoredUser(removed) };
}

function seedStoredUsers(inputs) {
  const users = Array.isArray(inputs) ? inputs.map(function(input, index) {
    if (!input.username || !input.password) throw new Error("Seed user needs username and password");
    return {
      id: "U-" + String(index + 1).padStart(3, "0"),
      username: String(input.username).trim().toLowerCase(),
      displayName: String(input.displayName || input.username).trim(),
      role: normalizeStoredRole(input.role),
      isActive: input.isActive === false ? false : true,
      passwordHash: hashStoredPassword(input.password),
      createdAt: nowTimestamp(),
      updatedAt: nowTimestamp()
    };
  }) : [];
  ensureActiveAdmin(users);
  saveStoredUsers(users);
  return { seeded: users.length };
}

function ensureActiveAdmin(users) {
  const hasAdmin = users.some(function(user) {
    return user.role === "admin" && user.isActive !== false;
  });
  if (!hasAdmin) throw new Error("At least one active admin is required");
}

function getStoredUsers() {
  const raw = PropertiesService.getScriptProperties().getProperty(USER_STORE_PROPERTY);
  if (!raw) return [];
  const users = JSON.parse(raw);
  return Array.isArray(users) ? users : [];
}

function saveStoredUsers(users) {
  PropertiesService.getScriptProperties().setProperty(USER_STORE_PROPERTY, JSON.stringify(users));
}

function getNextUserId(users) {
  let max = 0;
  users.forEach(function(user) {
    const number = parseInt(String(user.id || "").replace(/^U-/, ""), 10);
    if (!isNaN(number) && number > max) max = number;
  });
  return "U-" + String(max + 1).padStart(3, "0");
}

function hashStoredPassword(password) {
  const salt = Utilities.getUuid().replace(/-/g, "");
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + ":" + String(password || ""));
  return "sha256$" + salt + "$" + bytesToHex(digest);
}

function verifyStoredPassword(password, storedHash) {
  const parts = String(storedHash || "").split("$");
  if (parts.length !== 3 || parts[0] !== "sha256") return false;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, parts[1] + ":" + String(password || ""));
  return bytesToHex(digest) === parts[2];
}

function bytesToHex(bytes) {
  return bytes.map(function(byte) {
    const value = byte < 0 ? byte + 256 : byte;
    return ("0" + value.toString(16)).slice(-2);
  }).join("");
}

function normalizeStoredRole(role) {
  const value = String(role || "staff").trim().toLowerCase();
  if (value !== "admin" && value !== "staff") throw new Error("Role must be admin or staff");
  return value;
}

function serializeStoredUser(user) {
  return {
    id: String(user.id || ""),
    username: String(user.username || ""),
    displayName: String(user.displayName || user.username || ""),
    role: normalizeStoredRole(user.role),
    isActive: user.isActive !== false,
    createdAt: String(user.createdAt || ""),
    updatedAt: String(user.updatedAt || "")
  };
}

function nowTimestamp() {
  return Utilities.formatDate(new Date(), TIMEZONE, "dd/MM/yyyy HH:mm:ss");
}

function setupSpreadsheetConfiguration() {
  setSpreadsheetTimeZone(TIMEZONE);
  const sheet = getSheet(SHEETS.ACTIVITIES);
  sheet.getRange(1, 1, 1, ACTIVITY_HEADERS.length).setValues([ACTIVITY_HEADERS]);
  sheet.setFrozenRows(1);
  formatActivitiesSheet(sheet);
  ensureReferenceSheets();
  return getStatus();
}

function ensureReferenceSheets() {
  return {
    masterData: ensureMasterDataSheet(),
    departmentMapping: ensureDepartmentMappingSheet()
  };
}

function addReferenceOption(input) {
  const type = String(input.type || "").trim();
  const value = trimString(input.value);
  if (!type) throw new Error("Reference type is required");
  if (!value) throw new Error("Reference value is required");
  if (type === "department") {
    return addMasterOption("department", value);
  }
  if (type === "area") {
    const department = trimString(input.department);
    if (!department) throw new Error("Department is required");
    return addDepartmentArea(department, value);
  }
  if (isMasterReferenceType(type)) {
    return addMasterOption(type, value);
  }
  throw new Error("Unsupported reference type");
}

function deleteReferenceOption(input) {
  const type = String(input.type || "").trim();
  const value = trimString(input.value);
  if (!type) throw new Error("Reference type is required");
  if (!value) throw new Error("Reference value is required");
  if (type === "department") {
    return {
      deleted: deleteMasterOption("department", value),
      mappingDeleted: deleteDepartmentMappings(value, "")
    };
  }
  if (type === "area") {
    const department = trimString(input.department);
    if (!department) throw new Error("Department is required");
    return { deleted: deleteDepartmentMappings(department, value) };
  }
  if (isMasterReferenceType(type)) {
    return { deleted: deleteMasterOption(type, value) };
  }
  throw new Error("Unsupported reference type");
}

function isMasterReferenceType(type) {
  return Object.prototype.hasOwnProperty.call(DEFAULT_MASTER, type) && type !== "department";
}

function addMasterOption(type, value) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.MASTER);
  if (!sheet) throw new Error("Master_Data sheet not found");
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(item) { return String(item || "").trim(); });
  const hasTypeValue = findHeaderIndex(headers, ["Type"]) !== -1 && findHeaderIndex(headers, ["Value"]) !== -1;
  if (hasTypeValue) {
    const typeCol = findHeaderIndex(headers, ["Type"]);
    const valueCol = findHeaderIndex(headers, ["Value"]);
    const exists = values.slice(1).some(function(row) {
      return toCamelCase(row[typeCol]) === type && trimString(row[valueCol]) === value;
    });
    if (!exists) {
      const row = new Array(headers.length).fill("");
      row[typeCol] = type;
      row[valueCol] = value;
      sheet.appendRow(row);
    }
    return { saved: true, type: type, value: value };
  }

  const optionCol = findReferenceHeaderIndex(headers, type);
  if (optionCol === -1) throw new Error(capitalizeReferenceType(type) + " column not found");
  const exists = values.slice(1).some(function(row) { return trimString(row[optionCol]) === value; });
  if (!exists) {
    const row = new Array(headers.length).fill("");
    row[optionCol] = value;
    sheet.appendRow(row);
  }
  return { saved: true, type: type, value: value };
}

function deleteMasterOption(type, value) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.MASTER);
  if (!sheet) throw new Error("Master_Data sheet not found");
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(item) { return String(item || "").trim(); });
  const hasTypeValue = findHeaderIndex(headers, ["Type"]) !== -1 && findHeaderIndex(headers, ["Value"]) !== -1;
  let deleted = 0;

  if (hasTypeValue) {
    const typeCol = findHeaderIndex(headers, ["Type"]);
    const valueCol = findHeaderIndex(headers, ["Value"]);
    for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
      if (toCamelCase(values[rowIndex][typeCol]) === type && trimString(values[rowIndex][valueCol]) === value) {
        sheet.deleteRow(rowIndex + 1);
        deleted++;
      }
    }
    return deleted;
  }

  const optionCol = findReferenceHeaderIndex(headers, type);
  if (optionCol === -1) throw new Error(capitalizeReferenceType(type) + " column not found");
  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    if (trimString(values[rowIndex][optionCol]) === value) {
      sheet.getRange(rowIndex + 1, optionCol + 1).clearContent();
      deleted++;
    }
  }
  return deleted;
}

function addDepartmentArea(department, area) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.DEPARTMENTS);
  if (!sheet) throw new Error("Department_Mapping sheet not found");
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(item) { return String(item || "").trim(); });
  const departmentCol = findHeaderIndex(headers, ["Department"]);
  const areaCol = findHeaderIndex(headers, ["Area / Sub Department", "Area", "Sub Department"]);
  if (departmentCol === -1 || areaCol === -1) throw new Error("Mapping columns not found");
  const exists = values.slice(1).some(function(row) {
    return trimString(row[departmentCol]) === department && trimString(row[areaCol]) === area;
  });
  if (!exists) {
    const row = new Array(headers.length).fill("");
    row[departmentCol] = department;
    row[areaCol] = area;
    sheet.appendRow(row);
  }
  return { saved: true, department: department, area: area };
}

function deleteDepartmentMappings(department, area) {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.DEPARTMENTS);
  if (!sheet) throw new Error("Department_Mapping sheet not found");
  const values = sheet.getDataRange().getValues();
  const headers = values[0].map(function(item) { return String(item || "").trim(); });
  const departmentCol = findHeaderIndex(headers, ["Department"]);
  const areaCol = findHeaderIndex(headers, ["Area / Sub Department", "Area", "Sub Department"]);
  if (departmentCol === -1 || areaCol === -1) throw new Error("Mapping columns not found");
  let deleted = 0;
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    const sameDepartment = trimString(values[rowIndex][departmentCol]) === department;
    const sameArea = !area || trimString(values[rowIndex][areaCol]) === area;
    if (sameDepartment && sameArea) {
      sheet.deleteRow(rowIndex + 1);
      deleted++;
    }
  }
  return deleted;
}

function capitalizeReferenceType(type) {
  if (type === "department") return "Department";
  return String(type || "").charAt(0).toUpperCase() + String(type || "").slice(1);
}

function findReferenceHeaderIndex(headers, type) {
  for (let index = 0; index < headers.length; index++) {
    if (toCamelCase(headers[index]) === type) return index;
  }
  return -1;
}

function ensureMasterDataSheet() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.MASTER);
  if (!sheet) return { skipped: true, reason: "Master_Data sheet not found" };
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { skipped: true, reason: "Master_Data sheet is empty" };
  const headers = values[0].map(function(value) { return String(value || "").trim(); });
  const hasTypeValue = headers.indexOf("Type") !== -1 && headers.indexOf("Value") !== -1;
  let appended = 0;

  if (hasTypeValue) {
    const typeCol = headers.indexOf("Type") + 1;
    const valueCol = headers.indexOf("Value") + 1;
    Object.keys(DEFAULT_MASTER).forEach(function(type) {
      DEFAULT_MASTER[type].forEach(function(value) {
        const exists = values.slice(1).some(function(row) {
          return toCamelCase(row[typeCol - 1]) === type && trimString(row[valueCol - 1]) === value;
        });
        if (!exists) {
          const row = new Array(headers.length).fill("");
          row[typeCol - 1] = type;
          row[valueCol - 1] = value;
          sheet.appendRow(row);
          appended++;
        }
      });
    });
    return { appended: appended };
  }

  Object.keys(DEFAULT_MASTER).forEach(function(type) {
    const optionCol = findReferenceHeaderIndex(headers, type);
    if (optionCol === -1) return;
    const existing = values.slice(1).map(function(row) { return trimString(row[optionCol]); });
    DEFAULT_MASTER[type].forEach(function(value) {
      if (existing.indexOf(value) !== -1) return;
      const row = new Array(headers.length).fill("");
      row[optionCol] = value;
      sheet.appendRow(row);
      existing.push(value);
      appended++;
    });
  });
  return { appended: appended };
}

function ensureDepartmentMappingSheet() {
  const sheet = getSpreadsheet().getSheetByName(SHEETS.DEPARTMENTS);
  if (!sheet) return { skipped: true, reason: "Department_Mapping sheet not found" };
  const values = sheet.getDataRange().getValues();
  if (!values.length) return { skipped: true, reason: "Department_Mapping sheet is empty" };
  const headers = values[0].map(function(value) { return String(value || "").trim(); });
  const departmentCol = findHeaderIndex(headers, ["Department"]);
  const areaCol = findHeaderIndex(headers, ["Area / Sub Department", "Area", "Sub Department"]);
  if (departmentCol === -1 || areaCol === -1) return { skipped: true, reason: "Mapping columns not found" };
  let appended = 0;

  Object.keys(DEFAULT_DEPARTMENT_MAPPING).forEach(function(department) {
    DEFAULT_DEPARTMENT_MAPPING[department].forEach(function(area) {
      const exists = values.slice(1).some(function(row) {
        return trimString(row[departmentCol]) === department && trimString(row[areaCol]) === area;
      });
      if (!exists) {
        const row = new Array(headers.length).fill("");
        row[departmentCol] = department;
        row[areaCol] = area;
        sheet.appendRow(row);
        appended++;
      }
    });
  });
  return {
    appended: appended,
    removed: removeObsoleteDepartmentMappings(sheet, departmentCol, areaCol)
  };
}

function removeObsoleteDepartmentMappings(sheet, departmentCol, areaCol) {
  const values = sheet.getDataRange().getValues();
  let removed = 0;
  for (let rowIndex = values.length - 1; rowIndex >= 1; rowIndex--) {
    const department = trimString(values[rowIndex][departmentCol]);
    const area = trimString(values[rowIndex][areaCol]);
    const shouldRemove = OBSOLETE_DEPARTMENT_MAPPINGS.some(function(item) {
      return item.department === department && item.area === area;
    });
    if (shouldRemove) {
      sheet.deleteRow(rowIndex + 1);
      removed++;
    }
  }
  return removed;
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
  const normalizedHeaders = headers.map(function(header) {
    return String(header || "").trim().toLowerCase();
  });
  for (let i = 0; i < names.length; i++) {
    const index = headers.indexOf(names[i]);
    if (index !== -1) return index;
    const normalizedIndex = normalizedHeaders.indexOf(String(names[i] || "").trim().toLowerCase());
    if (normalizedIndex !== -1) return normalizedIndex;
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
    .toLowerCase()
    .replace(/[^a-z0-9]+([a-z0-9])/g, function(match, chr) { return chr.toUpperCase(); });
}
