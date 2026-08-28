(function () {
  "use strict";

  const TZ = "Asia/Jakarta";
  const API = {
    auth: "/api/auth",
    users: "/api/users",
    status: "/api/status",
    staff: "/api/staff",
    master: "/api/master",
    departments: "/api/departments",
    activities: "/api/activities",
    reference: "/api/reference"
  };

  const FALLBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec";
  const HARIS_WHATSAPP_NUMBER = "6285781220321";
  const MASTER_KEYS = ["shift", "plant", "department", "activityType", "supportMode", "productionImpact", "priority", "status", "deviceType", "category", "rootCauseCategory"];
  const ROUTINE_PROBLEM = "Daily routine check beberapa department.";
  const ROUTINE_ACTION = "Pengecekan kondisi PC, printer, network, dan device terkait.";
  const BATCH_HIDDEN_REQUIRED_FIELDS = ["date", "itStaff", "shift", "plant", "activityType", "supportMode", "status", "problem", "actionTaken"];
  const FILTER_FIELDS = [
    ["search", "Search", "search"],
    ["dateFrom", "Date From", "date"],
    ["dateTo", "Date To", "date"],
    ["itStaff", "IT Staff", "select"],
    ["shift", "Shift", "select"],
    ["plant", "Plant", "select"],
    ["department", "Department", "select"],
    ["area", "Area", "select"],
    ["supportMode", "Support Mode", "select"],
    ["category", "Category", "select"],
    ["status", "Status", "select"]
  ];

  const state = {
    activities: [],
    staff: [],
    master: {},
    departments: {},
    activityFilters: loadFilterPreference("activityFilters"),
    reportFilters: loadFilterPreference("reportFilters"),
    dashboardFilters: loadFilterPreference("dashboardFilters"),
    authToken: localStorage.getItem("itActivityAuthToken") || "",
    currentUser: loadFilterPreference("itActivityCurrentUser"),
    adminUsers: [],
    batchItems: [],
    charts: {},
    pendingDelete: null
  };

  const els = {};

  document.addEventListener("DOMContentLoaded", init);

  async function init() {
    cacheElements();
    applyTheme(localStorage.getItem("theme") || "light");
    bindEvents();
    setDefaultDate();
    buildFilterBar("activity-filter-bar", state.activityFilters, renderAll, "activityFilters");
    buildFilterBar("report-filter-bar", state.reportFilters, renderAll, "reportFilters");
    await restoreSession();
  }

  function cacheElements() {
    [
      "sync-state", "refresh-button", "metric-grid", "night-metric-grid", "night-top-department", "night-top-category",
      "my-alert-count", "my-alert-list", "team-alert-panel", "team-alert-count", "team-alert-list",
      "activity-form", "activity-id", "submit-button", "cancel-edit-button", "department", "area", "itStaff", "plant",
      "batchRoutine", "batch-content", "batch-rows", "add-batch-row",
      "batch-submit-button", "advanced-fields", "form-actions",
      "batchDate", "batchReportTime", "batchStartTime", "batchMinutesPerItem", "batchProblem", "batchActionTaken",
      "problem-grid", "reportTime", "startTime", "finishTime", "responseTime", "resolutionTime", "followUpTarget", "finishTarget", "notes", "activity-table-body", "empty-state",
      "report-table-body", "report-summary", "report-period", "toast", "confirm-dialog", "confirm-title", "confirm-message", "confirm-cancel", "confirm-ok",
      "dashboard-date-from", "dashboard-date-to", "dashboard-reset", "export-button", "print-button", "login-screen",
      "login-form", "login-username", "login-password", "login-button", "login-error", "menu-toggle", "menu-panel",
      "theme-light", "theme-dark", "logout-button", "admin-tab", "admin-user-form", "admin-user-id", "admin-username",
      "admin-display-name", "admin-role", "admin-password", "admin-is-active", "admin-reset-form", "admin-save-user",
      "admin-users-body", "admin-department-form", "admin-department-name", "admin-department-list", "admin-area-form",
      "admin-area-department", "admin-area-name", "admin-area-list"
    ].forEach((id) => {
      els[id] = document.getElementById(id);
    });
  }

  function bindEvents() {
    els["login-form"].addEventListener("submit", login);
    els["menu-toggle"].addEventListener("click", toggleMenu);
    els["theme-light"].addEventListener("click", () => setThemeFromMenu("light"));
    els["theme-dark"].addEventListener("click", () => setThemeFromMenu("dark"));
    els["logout-button"].addEventListener("click", logout);
    els["admin-user-form"].addEventListener("submit", saveUser);
    els["admin-reset-form"].addEventListener("click", resetAdminForm);
    els["admin-department-form"].addEventListener("submit", saveDepartmentOption);
    els["admin-area-form"].addEventListener("submit", saveAreaOption);
    els["admin-area-department"].addEventListener("change", renderAdminReference);
    document.querySelectorAll("[data-toggle-password]").forEach((button) => {
      button.addEventListener("click", () => togglePassword(button));
    });
    document.addEventListener("click", (event) => {
      if (!els["menu-panel"].contains(event.target) && event.target !== els["menu-toggle"]) {
        els["menu-panel"].classList.add("hidden");
      }
    });
    document.querySelectorAll(".nav-tab").forEach((button) => {
      button.addEventListener("click", () => showView(button.dataset.view));
    });
    els["refresh-button"].addEventListener("click", () => loadActivities(true));
    els["activity-form"].addEventListener("submit", saveActivity);
    els["cancel-edit-button"].addEventListener("click", resetForm);
    els.department.addEventListener("change", () => populateAreaSelect(els.department.value, ""));
    els.batchRoutine.addEventListener("change", () => setBatchRoutine(els.batchRoutine.checked));
    els["add-batch-row"].addEventListener("click", () => addBatchItem());
    ["batchDate", "batchReportTime", "batchStartTime", "batchMinutesPerItem", "batchProblem", "batchActionTaken"].forEach((id) => {
      els[id].addEventListener("input", syncBatchDefaults);
      els[id].addEventListener("change", syncBatchDefaults);
    });
    els.itStaff.addEventListener("change", fillPrimaryPlant);
    ["reportTime", "startTime", "finishTime"].forEach((id) => {
      els[id].addEventListener("input", updateDurationPreview);
      els[id].addEventListener("blur", () => normalizeTimeInput(id));
    });
    els["confirm-cancel"].addEventListener("click", closeConfirm);
    els["confirm-ok"].addEventListener("click", executeDelete);
    els["dashboard-date-from"].addEventListener("change", () => updateDashboardFilters());
    els["dashboard-date-to"].addEventListener("change", () => updateDashboardFilters());
    els["dashboard-reset"].addEventListener("click", resetDashboardFilters);
    els["export-button"].addEventListener("click", exportReport);
    els["print-button"].addEventListener("click", () => window.print());
  }

  async function restoreSession() {
    if (!state.authToken) {
      showLogin();
      return;
    }
    try {
      const response = await fetch(API.auth, { headers: authHeaders({ Accept: "application/json" }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Invalid session");
      state.currentUser = payload.data.user || {};
      localStorage.setItem("itActivityCurrentUser", JSON.stringify(state.currentUser));
      showApp();
      await boot();
      showInitialView();
    } catch (error) {
      logout(false);
    }
  }

  async function login(event) {
    event.preventDefault();
    els["login-error"].textContent = "";
    els["login-button"].disabled = true;
    els["login-button"].textContent = "Checking...";
    try {
      const response = await fetch(API.auth, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ username: els["login-username"].value, password: els["login-password"].value })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Login failed");
      state.authToken = payload.data.token;
      state.currentUser = payload.data.user || {};
      localStorage.setItem("itActivityAuthToken", state.authToken);
      localStorage.setItem("itActivityCurrentUser", JSON.stringify(state.currentUser));
      els["login-username"].value = "";
      els["login-password"].value = "";
      showApp();
      await boot();
      showInitialView();
    } catch (error) {
      els["login-error"].textContent = error.message;
    } finally {
      els["login-button"].disabled = false;
      els["login-button"].textContent = "Login";
    }
  }

  function logout(showMessage) {
    state.authToken = "";
    state.currentUser = {};
    localStorage.removeItem("itActivityAuthToken");
    localStorage.removeItem("itActivityCurrentUser");
    state.activities = [];
    renderAll();
    showLogin();
    if (showMessage !== false) showToast("Logout berhasil.");
  }

  function showLogin() {
    els["login-screen"].classList.remove("hidden");
    document.querySelectorAll(".app-frame").forEach((node) => node.classList.add("hidden"));
    setSyncState("Login");
  }

  function showApp() {
    els["login-screen"].classList.add("hidden");
    document.querySelectorAll(".app-frame").forEach((node) => node.classList.remove("hidden"));
    els["admin-tab"].classList.toggle("hidden", state.currentUser.role !== "admin");
  }

  function authHeaders(headers) {
    const output = Object.assign({}, headers || {});
    if (state.authToken) output.Authorization = "Bearer " + state.authToken;
    return output;
  }

  function toggleMenu() {
    els["menu-panel"].classList.toggle("hidden");
  }

  function setThemeFromMenu(theme) {
    applyTheme(theme);
    localStorage.setItem("theme", theme);
    els["menu-panel"].classList.add("hidden");
  }

  function applyTheme(theme) {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "light";
  }

  function togglePassword(button) {
    const input = document.getElementById(button.dataset.togglePassword);
    if (!input) return;
    const visible = input.type === "text";
    input.type = visible ? "password" : "text";
    button.textContent = visible ? "👁" : "⊘";
    button.setAttribute("aria-label", visible ? "Tampilkan password" : "Sembunyikan password");
    button.classList.toggle("is-visible", !visible);
  }

  function defaultView() {
    return state.currentUser.role === "admin" ? "dashboard" : "add";
  }

  function showInitialView() {
    const linkedActivity = getLinkedActivityId();
    if (linkedActivity) {
      state.activityFilters.search = linkedActivity;
      localStorage.setItem("activityFilters", JSON.stringify(state.activityFilters));
      buildFilterBar("activity-filter-bar", state.activityFilters, renderAll, "activityFilters");
      showView("activities");
      return;
    }
    showView(defaultView());
  }

  function getLinkedActivityId() {
    return new URLSearchParams(window.location.search).get("activity") || "";
  }

  async function boot() {
    setSyncState("Loading");
    try {
      const [staff, master, departments] = await Promise.all([
        fetchJson(API.staff, "staff"),
        fetchJson(API.master, "master"),
        fetchJson(API.departments, "departments")
      ]);
      state.staff = Array.isArray(staff) ? staff : [];
      state.master = normalizeMaster(master || {});
      state.departments = departments || {};
      populateFormOptions();
      applyDefaultFormValues();
      buildFilterBar("activity-filter-bar", state.activityFilters, renderAll, "activityFilters");
      buildFilterBar("report-filter-bar", state.reportFilters, renderAll, "reportFilters");
      rebuildAreaFilters();
      syncDashboardFilterInputs();
      renderAdminReference();
      await loadActivities(false);
      setSyncState("Online", "ok");
    } catch (error) {
      setSyncState("Error", "error");
      showToast(error.message || "Gagal memuat data master", true);
      populateFormOptions();
      renderAll();
    }
  }

  async function loadActivities(manual) {
    if (manual) setSyncState("Refreshing");
    try {
      const payload = await fetchPayload(API.activities, "activities");
      const data = payload.data;
      state.activities = Array.isArray(data) ? data.map(normalizeActivity) : [];
      renderAll();
      if (payload.warning) {
        setSyncState("API setup", "error");
        if (manual) showToast(payload.warning, true);
      } else {
        setSyncState("Online", "ok");
        if (manual) showToast("Data activity diperbarui dari spreadsheet.");
      }
    } catch (error) {
      state.activities = [];
      renderAll();
      setSyncState("API setup", "error");
      showToast(error.message || "Activities API belum tersedia", true);
    }
  }

  async function fetchJson(url, publicAction) {
    const payload = await fetchPayload(url, publicAction);
    return payload.data;
  }

  async function fetchPayload(url, publicAction) {
    try {
      const response = await fetch(url, { headers: authHeaders({ Accept: "application/json" }) });
      if (response.status === 401) {
        logout(false);
        throw new Error("Session login habis. Silakan login lagi.");
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error || "API request failed");
      return payload;
    } catch (error) {
      if (publicAction && publicAction !== "activities") {
        const fallback = await fetch(FALLBACK_SCRIPT_URL + "?action=" + encodeURIComponent(publicAction));
        const payload = await fallback.json();
        if (!payload.success) throw new Error(payload.error || "Fallback API failed");
        return payload;
      }
      throw error;
    }
  }

  function normalizeMaster(master) {
    const defaults = {
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
      rootCauseCategory: ["Hardware", "Software", "Network", "Configuration", "Consumable", "User Operation", "Power", "Infrastructure", "Unknown", "Other"]
    };
    const normalized = Object.assign({}, defaults);
    MASTER_KEYS.forEach((key) => {
      if (Array.isArray(master[key]) && master[key].length) normalized[key] = master[key];
    });
    return normalized;
  }

  function populateFormOptions() {
    populateSelect(els.itStaff, state.staff.map((staff) => staff.name), "Select staff");
    MASTER_KEYS.forEach((key) => {
      const el = document.getElementById(key);
      if (el) populateSelect(el, state.master[key] || [], key === "deviceType" || key === "category" || key === "rootCauseCategory" || key === "productionImpact" || key === "priority" ? "Optional" : "Select");
    });
    populateAreaSelect(els.department.value, "");
    renderBatchRows();
  }

  function applyDefaultFormValues() {
    setDefaultDate();
    setDefaultTimeIfEmpty("reportTime");
    setDefaultTimeIfEmpty("startTime");
    setStaffFromLogin();
    setSelectDefault("shift", currentShiftWib());
    setSelectDefault("status", "Resolved");
    setSelectDefault("activityType", "Incident");
    setSelectDefault("supportMode", "On-Site");
    setSelectDefault("productionImpact", "No Impact");
    setSelectDefault("priority", "Medium");
    fillPrimaryPlant();
  }

  function setSelectDefault(id, preferred) {
    const select = document.getElementById(id);
    if (!select || select.value) return;
    const options = Array.from(select.options).map((option) => option.value);
    select.value = options.includes(preferred) ? preferred : options.find(Boolean) || "";
  }

  function setStaffFromLogin() {
    if (!els.itStaff || els.itStaff.value || !state.currentUser.username) return;
    const match = state.staff.find((staff) => {
      return equals(staff.name, state.currentUser.displayName) || equals(staff.name, state.currentUser.username);
    });
    if (match) els.itStaff.value = match.name;
  }

  function setDefaultTimeIfEmpty(id) {
    const input = document.getElementById(id);
    if (input && !input.value) input.value = jakartaTimeInput(new Date());
  }

  function currentTimeWib() {
    return jakartaTimeInput(new Date());
  }

  function currentShiftWib() {
    const hour = Number(jakartaTimeInput(new Date()).slice(0, 2));
    if (hour >= 6 && hour < 14) return "Morning";
    if (hour >= 14 && hour < 22) return "Evening";
    return "Night";
  }

  function populateSelect(select, options, placeholder) {
    removeChildren(select);
    const first = document.createElement("option");
    first.value = "";
    first.textContent = placeholder || "Select";
    select.appendChild(first);
    options.forEach((value) => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = value;
      select.appendChild(option);
    });
  }

  function populateAreaSelect(department, selected) {
    const areas = state.departments[department] || [];
    populateSelect(els.area, areas, areas.length ? "Select area" : "Optional");
    els.area.disabled = areas.length === 0;
    if (selected && areas.includes(selected)) els.area.value = selected;
  }

  function fillPrimaryPlant() {
    const selected = state.staff.find((staff) => staff.name === els.itStaff.value);
    if (selected && selected.primaryPlant && !els.plant.value) {
      els.plant.value = selected.primaryPlant;
    }
  }

  function setDefaultDate() {
    document.getElementById("date").value = jakartaDateInput(new Date());
  }

  function showView(view) {
    if (view === "admin" && state.currentUser.role !== "admin") return;
    document.querySelectorAll(".nav-tab").forEach((button) => {
      button.classList.toggle("is-active", button.dataset.view === view);
    });
    document.querySelectorAll(".view").forEach((section) => {
      section.classList.toggle("is-active", section.id === "view-" + view);
    });
    if (view === "admin") {
      loadUsers();
      renderAdminReference();
    }
  }

  async function saveActivity(event) {
    event.preventDefault();
    const activity = formToActivity();
    const id = els["activity-id"].value;
    const buttonText = els["submit-button"].textContent;
    const batchButtonText = els["batch-submit-button"].textContent;
    els["submit-button"].disabled = true;
    els["batch-submit-button"].disabled = true;
    els["submit-button"].textContent = "Menyimpan...";
    els["batch-submit-button"].textContent = "Menyimpan...";
    try {
      const batchActivities = !id && els.batchRoutine.checked ? buildBatchActivities(activity) : null;
      if (batchActivities) {
        const ids = [];
        for (const item of batchActivities) {
          const saved = await persistActivity(item);
          ids.push(saved.id);
        }
        showToast(ids.length + " activity routine check tersimpan.");
      } else {
        const saved = await persistActivity(activity, id);
        showToast(id ? "Activity berhasil diperbarui." : "Activity tersimpan: " + saved.id);
      }
      resetForm();
      await loadActivities(false);
      showView("activities");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      els["submit-button"].disabled = false;
      els["batch-submit-button"].disabled = false;
      els["submit-button"].textContent = buttonText;
      els["batch-submit-button"].textContent = batchButtonText;
    }
  }

  async function persistActivity(activity, id) {
    const response = await fetch(API.activities, {
      method: id ? "PUT" : "POST",
      headers: authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
      body: JSON.stringify(id ? Object.assign({ id }, activity) : activity)
    });
    const payload = await response.json();
    if (!response.ok || !payload.success) throw new Error(payload.error || "Save failed");
    return payload.data;
  }

  function buildBatchActivities(activity) {
    ["batchReportTime", "batchStartTime"].forEach(normalizeTimeInput);
    const baseDate = els.batchDate.value || activity.date;
    if (!baseDate) {
      throw new Error("Date batch wajib diisi.");
    }
    const minutesPerItem = Number(els.batchMinutesPerItem.value || 5);
    if (!Number.isFinite(minutesPerItem) || minutesPerItem < 1) {
      throw new Error("Menit per item wajib minimal 1.");
    }
    const batchStartMinutes = parseTime(els.batchStartTime.value || activity.startTime);
    if (batchStartMinutes === null) {
      throw new Error("Start Time WIB batch belum valid.");
    }
    const batchProblem = els.batchProblem.value.trim() || activity.problem;
    const batchAction = els.batchActionTaken.value.trim() || activity.actionTaken;
    if (!batchProblem || !batchAction) {
      throw new Error("Problem dan Action Taken batch wajib diisi.");
    }
    const items = state.batchItems
      .map((item) => ({
        department: String(item.department || "").trim(),
        area: String(item.area || "").trim(),
        qty: positiveNumber(item.qty, 1),
        detail: String(item.detail || "").trim()
      }))
      .filter((item) => item.department);
    if (!items.length) {
      throw new Error("Batch routine check belum punya department.");
    }
    let cursor = batchStartMinutes;
    return items.map((item, index) => {
      const label = item.department + (item.area ? " / " + item.area : "");
      const detail = item.detail ? label + ": " + item.detail : label;
      const duration = item.qty * minutesPerItem;
      const finishCursor = cursor + duration;
      const startDayOffset = Math.floor(cursor / (24 * 60));
      const finishDayOffset = Math.floor(finishCursor / (24 * 60));
      const activityDate = addDaysToDateInput(baseDate, startDayOffset);
      const finishDate = addDaysToDateInput(baseDate, finishDayOffset);
      const startTime = formatClock(cursor);
      const finishTime = formatClock(finishCursor);
      const reportTime = startDayOffset > 0 ? startTime : (els.batchReportTime.value || activity.reportTime || startTime);
      const timingNote = "Waktu batch: " + displayDate(activityDate) + " " + startTime + " - " + displayDate(finishDate) + " " + finishTime + " WIB";
      cursor = finishCursor;
      return Object.assign({}, activity, {
        date: activityDate,
        department: item.department,
        area: item.area,
        activityType: "Routine Check",
        category: activity.category || "Preventive Maintenance",
        assetName: activity.assetName || "Daily Routine Check",
        problem: appendLine(batchProblem, "Check " + detail),
        actionTaken: appendLine(batchAction, item.qty + " item x " + minutesPerItem + " menit"),
        reportTime,
        startTime,
        finishTime,
        notes: appendLine(activity.notes, "Batch Routine Check #" + (index + 1) + ": " + label + " | Qty " + item.qty + " | Durasi " + duration + " menit | " + timingNote)
      });
    });
  }

  function formToActivity() {
    const data = {};
    ["reportTime", "startTime", "finishTime"].forEach(normalizeTimeInput);
    ["date", "itStaff", "shift", "plant", "department", "area", "user", "location", "assetName", "deviceType", "category", "activityType", "problem", "actionTaken", "supportMode", "productionImpact", "priority", "reportTime", "startTime", "finishTime", "rootCauseCategory", "rootCauseDetail", "status", "notes"].forEach((key) => {
      data[key] = (document.getElementById(key).value || "").trim();
    });
    data.notes = composeNotes(data.notes, {
      followUpTarget: els.followUpTarget.value,
      finishTarget: els.finishTarget.value
    });
    data.responseTime = calculateDuration(data.reportTime, data.startTime);
    data.resolutionTime = calculateDuration(data.startTime, data.finishTime);
    return data;
  }

  function resetForm() {
    els["activity-form"].reset();
    els["activity-id"].value = "";
    els["submit-button"].textContent = "Simpan Activity";
    document.getElementById("form-title").textContent = "Input Activity";
    state.batchItems = [];
    els.batchRoutine.checked = false;
    resetBatchDefaults();
    els["batch-content"].classList.add("hidden");
    els["problem-grid"].classList.remove("hidden");
    els["advanced-fields"].classList.remove("hidden");
    els["form-actions"].classList.remove("hidden");
    setBatchHiddenRequired(false);
    renderBatchRows();
    setDefaultDate();
    populateAreaSelect("", "");
    applyDefaultFormValues();
    updateDurationPreview();
  }

  function editActivity(id) {
    const activity = state.activities.find((item) => item.id === id);
    if (!activity) return;
    showView("add");
    els["activity-id"].value = activity.id;
    document.getElementById("form-title").textContent = "Edit Activity";
    const noteMeta = parseNoteMeta(activity.notes);
    Object.keys(activity).forEach((key) => {
      const input = document.getElementById(key);
      if (input && key !== "area") input.value = activity[key] || "";
    });
    els.notes.value = noteMeta.cleanNotes;
    els.followUpTarget.value = noteMeta.followUpTarget;
    els.finishTarget.value = noteMeta.finishTarget;
    state.batchItems = [];
    els.batchRoutine.checked = false;
    els["batch-content"].classList.add("hidden");
    els["problem-grid"].classList.remove("hidden");
    els["advanced-fields"].classList.remove("hidden");
    els["form-actions"].classList.remove("hidden");
    setBatchHiddenRequired(false);
    renderBatchRows();
    populateAreaSelect(activity.department, activity.area);
    els["submit-button"].textContent = "Update Activity";
    updateDurationPreview();
  }

  function setBatchRoutine(enabled) {
    els["batch-content"].classList.toggle("hidden", !enabled);
    els["problem-grid"].classList.toggle("hidden", enabled);
    els["advanced-fields"].classList.toggle("hidden", enabled);
    els["form-actions"].classList.toggle("hidden", enabled);
    setBatchHiddenRequired(enabled);
    if (!enabled) return;
    if (!state.batchItems.length) addBatchItem(false);
    setBatchDefaultsFromForm();
    setSelectDefault("department", "ALL DEPT");
    populateAreaSelect("ALL DEPT", "");
    setSelectDefault("activityType", "Routine Check");
    setSelectDefault("category", "Preventive Maintenance");
    setSelectDefault("supportMode", "On-Site");
    setSelectDefault("status", "Resolved");
    if (!document.getElementById("problem").value.trim()) document.getElementById("problem").value = ROUTINE_PROBLEM;
    if (!document.getElementById("actionTaken").value.trim()) document.getElementById("actionTaken").value = ROUTINE_ACTION;
    syncBatchDefaults();
    renderBatchRows();
  }

  function setBatchHiddenRequired(isBatchMode) {
    BATCH_HIDDEN_REQUIRED_FIELDS.forEach((id) => {
      const input = document.getElementById(id);
      if (!input) return;
      if (isBatchMode) {
        if (!Object.prototype.hasOwnProperty.call(input.dataset, "wasRequired")) {
          input.dataset.wasRequired = input.required ? "1" : "";
        }
        input.required = false;
      } else if (input.dataset.wasRequired === "1") {
        input.required = true;
        delete input.dataset.wasRequired;
      } else {
        delete input.dataset.wasRequired;
      }
    });
  }

  function addBatchItem(render) {
    state.batchItems.push({ department: "", area: "", qty: 1, detail: "" });
    if (render !== false) renderBatchRows();
  }

  function removeBatchItem(index) {
    state.batchItems.splice(index, 1);
    renderBatchRows();
  }

  function renderBatchRows() {
    if (!els["batch-rows"]) return;
    removeChildren(els["batch-rows"]);
    state.batchItems.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "batch-row";

      const department = document.createElement("select");
      populateSelect(department, state.master.department || [], "Department");
      department.value = item.department;
      department.addEventListener("change", () => {
        state.batchItems[index].department = department.value;
        state.batchItems[index].area = "";
        renderBatchRows();
      });

      const area = document.createElement("select");
      const areas = state.departments[item.department] || [];
      populateSelect(area, areas, areas.length ? "Area" : "Optional");
      area.disabled = areas.length === 0;
      area.value = areas.includes(item.area) ? item.area : "";
      area.addEventListener("change", () => {
        state.batchItems[index].area = area.value;
      });

      const qty = document.createElement("input");
      qty.type = "number";
      qty.min = "1";
      qty.max = "999";
      qty.value = item.qty || 1;
      qty.placeholder = "Qty";
      qty.title = "Jumlah PC atau device yang dicek";
      qty.setAttribute("aria-label", "Jumlah PC atau device yang dicek");
      qty.addEventListener("input", () => {
        state.batchItems[index].qty = positiveNumber(qty.value, 1);
      });

      const detail = document.createElement("input");
      detail.type = "text";
      detail.placeholder = "Yang dicek / temuan singkat";
      detail.value = item.detail;
      detail.addEventListener("input", () => {
        state.batchItems[index].detail = detail.value;
      });

      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "secondary-button";
      remove.textContent = "Hapus";
      remove.addEventListener("click", () => removeBatchItem(index));

      row.append(department, area, qty, detail, remove);
      els["batch-rows"].appendChild(row);
    });
  }

  function setBatchDefaultsFromForm() {
    els.batchDate.value = els.batchDate.value || document.getElementById("date").value || jakartaDateInput(new Date());
    els.batchReportTime.value = els.batchReportTime.value || els.reportTime.value || currentTimeWib();
    els.batchStartTime.value = els.batchStartTime.value || els.startTime.value || currentTimeWib();
    els.batchMinutesPerItem.value = els.batchMinutesPerItem.value || "5";
    els.batchProblem.value = els.batchProblem.value || document.getElementById("problem").value.trim() || ROUTINE_PROBLEM;
    els.batchActionTaken.value = els.batchActionTaken.value || document.getElementById("actionTaken").value.trim() || ROUTINE_ACTION;
  }

  function resetBatchDefaults() {
    ["batchDate", "batchReportTime", "batchStartTime", "batchProblem", "batchActionTaken"].forEach((id) => {
      if (els[id]) els[id].value = "";
    });
    if (els.batchMinutesPerItem) els.batchMinutesPerItem.value = "5";
  }

  function syncBatchDefaults() {
    if (!els.batchRoutine.checked) return;
    if (els.batchDate.value) document.getElementById("date").value = els.batchDate.value;
    if (els.batchReportTime.value) els.reportTime.value = els.batchReportTime.value;
    if (els.batchStartTime.value) els.startTime.value = els.batchStartTime.value;
    if (els.batchProblem.value.trim()) document.getElementById("problem").value = els.batchProblem.value.trim();
    if (els.batchActionTaken.value.trim()) document.getElementById("actionTaken").value = els.batchActionTaken.value.trim();
    updateDurationPreview();
  }

  function confirmDelete(id, type) {
    const deleteType = type || "activity";
    state.pendingDelete = { id, type: deleteType };
    els["confirm-title"].textContent = deleteType === "user" ? "Hapus User" : "Hapus Activity";
    els["confirm-message"].textContent = deleteType === "user"
      ? "User ini akan dihapus dari sistem login."
      : "Activity ini akan dihapus dari spreadsheet.";
    els["confirm-dialog"].classList.remove("hidden");
  }

  function closeConfirm() {
    state.pendingDelete = null;
    els["confirm-dialog"].classList.add("hidden");
  }

  async function executeDelete() {
    if (!state.pendingDelete) return;
    const { id, type } = state.pendingDelete;
    closeConfirm();
    if (type === "user") {
      await deleteUser(id);
      return;
    }
    try {
      const response = await fetch(API.activities + "?id=" + encodeURIComponent(id), {
        method: "DELETE",
        headers: authHeaders({ Accept: "application/json" })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Delete failed");
      showToast("Activity " + id + " dihapus.");
      await loadActivities(false);
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function loadUsers() {
    if (state.currentUser.role !== "admin") return;
    try {
      const response = await fetch(API.users, { headers: authHeaders({ Accept: "application/json" }) });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Gagal load user");
      state.adminUsers = Array.isArray(payload.data) ? payload.data : [];
      renderAdminUsers();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function saveUser(event) {
    event.preventDefault();
    const id = els["admin-user-id"].value;
    const body = {
      username: els["admin-username"].value.trim().toLowerCase(),
      displayName: els["admin-display-name"].value.trim(),
      role: els["admin-role"].value,
      isActive: els["admin-is-active"].checked
    };
    if (els["admin-password"].value) body.password = els["admin-password"].value;
    if (id) body.id = id;
    if (!id && !body.password) {
      showToast("Password wajib untuk user baru.", true);
      return;
    }

    els["admin-save-user"].disabled = true;
    try {
      const response = await fetch(API.users, {
        method: id ? "PUT" : "POST",
        headers: authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify(body)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Gagal simpan user");
      showToast(id ? "User berhasil diupdate." : "User berhasil dibuat.");
      resetAdminForm();
      await loadUsers();
    } catch (error) {
      showToast(error.message, true);
    } finally {
      els["admin-save-user"].disabled = false;
    }
  }

  function renderAdminUsers() {
    removeChildren(els["admin-users-body"]);
    state.adminUsers.forEach((user) => {
      const tr = document.createElement("tr");
      [user.username, user.displayName, user.role, user.isActive ? "Active" : "Inactive", formatWibDateTime(user.updatedAt)].forEach((value) => appendCell(tr, value));
      const action = document.createElement("td");
      action.className = "table-actions";
      const edit = document.createElement("button");
      edit.className = "secondary-button";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editUser(user));
      const del = document.createElement("button");
      del.className = "danger-button";
      del.type = "button";
      del.textContent = "Hapus";
      del.addEventListener("click", () => confirmDelete(user.id, "user"));
      action.appendChild(edit);
      action.appendChild(del);
      tr.appendChild(action);
      els["admin-users-body"].appendChild(tr);
    });
  }

  async function deleteUser(id) {
    try {
      const response = await fetch(API.users + "?id=" + encodeURIComponent(id), {
        method: "DELETE",
        headers: authHeaders({ Accept: "application/json" })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Gagal hapus user");
      showToast("User berhasil dihapus.");
      await loadUsers();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  function editUser(user) {
    els["admin-user-id"].value = user.id;
    els["admin-username"].value = user.username;
    els["admin-display-name"].value = user.displayName;
    els["admin-role"].value = user.role;
    els["admin-is-active"].checked = Boolean(user.isActive);
    els["admin-password"].value = "";
    els["admin-password"].placeholder = "Kosongkan jika tidak diganti";
    els["admin-save-user"].textContent = "Update User";
  }

  function resetAdminForm() {
    els["admin-user-form"].reset();
    els["admin-user-id"].value = "";
    els["admin-is-active"].checked = true;
    els["admin-password"].placeholder = "";
    els["admin-save-user"].textContent = "Simpan User";
  }

  async function saveDepartmentOption(event) {
    event.preventDefault();
    const value = els["admin-department-name"].value.trim().toUpperCase();
    if (!value) {
      showToast("Nama department wajib diisi.", true);
      return;
    }
    await saveReference({ type: "department", value });
    els["admin-department-name"].value = "";
  }

  async function saveAreaOption(event) {
    event.preventDefault();
    const department = els["admin-area-department"].value;
    const value = els["admin-area-name"].value.trim().toUpperCase();
    if (!department || !value) {
      showToast("Department dan area wajib diisi.", true);
      return;
    }
    await saveReference({ type: "area", department, value });
    els["admin-area-name"].value = "";
  }

  async function saveReference(option) {
    try {
      const response = await fetch(API.reference, {
        method: "POST",
        headers: authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify(option)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Gagal simpan master data");
      showToast("Master data berhasil disimpan.");
      await reloadReferenceData();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function deleteReference(option) {
    try {
      const params = new URLSearchParams(option);
      const response = await fetch(API.reference + "?" + params.toString(), {
        method: "DELETE",
        headers: authHeaders({ Accept: "application/json" })
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Gagal hapus master data");
      showToast("Master data berhasil dihapus.");
      await reloadReferenceData();
    } catch (error) {
      showToast(error.message, true);
    }
  }

  async function reloadReferenceData() {
    const [master, departments] = await Promise.all([
      fetchJson(API.master, "master"),
      fetchJson(API.departments, "departments")
    ]);
    state.master = normalizeMaster(master || {});
    state.departments = departments || {};
    populateFormOptions();
    buildFilterBar("activity-filter-bar", state.activityFilters, renderAll, "activityFilters");
    buildFilterBar("report-filter-bar", state.reportFilters, renderAll, "reportFilters");
    rebuildAreaFilters();
    renderAdminReference();
    renderAll();
  }

  function renderAdminReference() {
    if (!els["admin-department-list"]) return;
    const currentDepartment = els["admin-area-department"].value;
    populateSelect(els["admin-area-department"], state.master.department || [], "Pilih department");
    if ((state.master.department || []).includes(currentDepartment)) els["admin-area-department"].value = currentDepartment;
    renderReferenceChips(els["admin-department-list"], state.master.department || [], (department) => {
      deleteReference({ type: "department", value: department });
    });
    const department = els["admin-area-department"].value;
    renderReferenceChips(els["admin-area-list"], state.departments[department] || [], (area) => {
      deleteReference({ type: "area", department, value: area });
    });
  }

  function renderReferenceChips(container, items, onDelete) {
    removeChildren(container);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "alert-empty";
      empty.textContent = "Belum ada data.";
      container.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const chip = document.createElement("span");
      chip.className = "data-chip";
      const label = document.createElement("span");
      label.textContent = item;
      const button = document.createElement("button");
      button.type = "button";
      button.title = "Hapus";
      button.textContent = "x";
      button.addEventListener("click", () => onDelete(item));
      chip.append(label, button);
      container.appendChild(chip);
    });
  }

  function updateDurationPreview() {
    els.responseTime.value = calculateDuration(els.reportTime.value, els.startTime.value);
    els.resolutionTime.value = calculateDuration(els.startTime.value, els.finishTime.value);
  }

  function normalizeTimeInput(id) {
    const input = document.getElementById(id);
    if (!input || !input.value) return;
    const match = input.value.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return;
    input.value = match[1].padStart(2, "0") + ":" + match[2];
  }

  function calculateDuration(start, finish) {
    if (!start || !finish) return "";
    const startMinutes = parseTime(start);
    const finishMinutesRaw = parseTime(finish);
    if (startMinutes === null || finishMinutesRaw === null) return "";
    let finishMinutes = finishMinutesRaw;
    if (finishMinutes < startMinutes) finishMinutes += 24 * 60;
    return formatDuration(finishMinutes - startMinutes);
  }

  function parseTime(value) {
    const match = String(value).match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return null;
    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (hours > 23 || minutes > 59) return null;
    return hours * 60 + minutes;
  }

  function formatClock(totalMinutes) {
    const normalized = ((totalMinutes % (24 * 60)) + (24 * 60)) % (24 * 60);
    const hours = Math.floor(normalized / 60);
    const minutes = normalized % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
  }

  function addDaysToDateInput(value, days) {
    const normalized = normalizeDateInput(value);
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return normalized;
    const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
    date.setDate(date.getDate() + Number(days || 0));
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return year + "-" + month + "-" + day;
  }

  function formatDuration(totalMinutes) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return String(hours).padStart(2, "0") + ":" + String(minutes).padStart(2, "0");
  }

  function buildFilterBar(id, filterState, onChange, storageKey) {
    const container = document.getElementById(id);
    removeChildren(container);
    FILTER_FIELDS.forEach(([key, label, type]) => {
      const input = type === "select" ? document.createElement("select") : document.createElement("input");
      input.id = id + "-" + key;
      input.dataset.filterKey = key;
      if (type === "search") {
        input.type = "search";
        input.placeholder = "Search problem, action, user, asset";
      } else if (type === "date") {
        input.type = "date";
        input.setAttribute("aria-label", label);
      } else {
        populateFilterSelect(input, key, label);
      }
      input.value = filterState[key] || "";
      input.addEventListener("change", () => {
        filterState[key] = input.value;
        if (key === "department") {
          const allowed = input.value ? state.departments[input.value] || [] : unique(Object.values(state.departments).flat());
          if (filterState.area && !allowed.includes(filterState.area)) filterState.area = "";
          rebuildAreaFilters();
        }
        localStorage.setItem(storageKey, JSON.stringify(filterState));
        onChange();
      });
      if (type === "search") {
        input.addEventListener("input", () => {
          filterState[key] = input.value;
          localStorage.setItem(storageKey, JSON.stringify(filterState));
          onChange();
        });
      }
      container.appendChild(input);
    });
    const reset = document.createElement("button");
    reset.className = "secondary-button";
    reset.type = "button";
    reset.textContent = "Reset";
    reset.addEventListener("click", () => {
      Object.keys(filterState).forEach((key) => delete filterState[key]);
      localStorage.setItem(storageKey, JSON.stringify(filterState));
      buildFilterBar(id, filterState, onChange, storageKey);
      onChange();
    });
    container.appendChild(reset);
  }

  function populateFilterSelect(select, key, label) {
    let options = [];
    if (key === "itStaff") options = state.staff.map((staff) => staff.name);
    if (state.master[key]) options = state.master[key];
    if (key === "area") options = unique(Object.values(state.departments).flat());
    populateSelect(select, options, "All " + label);
  }

  function rebuildAreaFilters() {
    ["activity-filter-bar", "report-filter-bar"].forEach((barId) => {
      const department = document.getElementById(barId + "-department").value;
      const areaSelect = document.getElementById(barId + "-area");
      const areas = department ? state.departments[department] || [] : unique(Object.values(state.departments).flat());
      const current = areaSelect.value;
      populateSelect(areaSelect, areas, "All Area");
      areaSelect.value = areas.includes(current) ? current : "";
    });
  }

  function renderAll() {
    renderDashboard();
    renderActivityTable();
    renderReport();
  }

  function renderDashboard() {
    const data = filterActivities(state.activities, state.dashboardFilters);
    const summary = getSummary(data);
    renderMetricGrid(els["metric-grid"], [
      ["Total Activity", summary.total, "All records in current filter"],
      ["Resolved", summary.resolved, summary.resolvedRate + "% completion"],
      ["In Progress", summary.inProgress, "Still being handled"],
      ["Pending", summary.pending, "Waiting for next action"],
      ["On-Site", summary.onSite, "Physical support"],
      ["Remote", summary.remote, "Remote handling"],
      ["Average Response", summary.avgResponse, "Start Time - Report Time"],
      ["Average Resolution", summary.avgResolution, "Finish Time - Start Time"]
    ]);
    renderWorkAlerts(data);
    renderCharts(data);
    renderNightAnalytics(data);
  }

  function renderWorkAlerts(data) {
    const openItems = data.filter((item) => isOpenStatus(item.status));
    const myItems = openItems.filter((item) => equals(item.itStaff, state.currentUser.displayName) || equals(item.itStaff, state.currentUser.username));
    renderAlertList(els["my-alert-list"], myItems.slice(0, 8));
    els["my-alert-count"].textContent = String(myItems.length);

    const isAdmin = state.currentUser.role === "admin";
    els["team-alert-panel"].classList.toggle("hidden", !isAdmin);
    if (isAdmin) {
      renderAlertList(els["team-alert-list"], openItems.slice(0, 12), true);
      els["team-alert-count"].textContent = String(openItems.length);
    }
  }

  function renderAlertList(container, items, showStaff) {
    removeChildren(container);
    if (!items.length) {
      const empty = document.createElement("p");
      empty.className = "alert-empty";
      empty.textContent = "Tidak ada pending/proses.";
      container.appendChild(empty);
      return;
    }
    items.forEach((item) => {
      const meta = parseNoteMeta(item.notes);
      const targetLabel = equals(item.status, "Pending") ? "Target gas" : "Target selesai";
      const targetValue = equals(item.status, "Pending") ? meta.followUpTarget : meta.finishTarget;
      const row = document.createElement("button");
      row.type = "button";
      row.className = "alert-item";
      row.addEventListener("click", () => openActivityLink(item.id));

      const title = document.createElement("strong");
      title.textContent = (showStaff ? item.itStaff + " - " : "") + (item.department || "-") + " / " + (item.area || "-");
      const desc = document.createElement("span");
      desc.textContent = item.problem || "-";
      const metaLine = document.createElement("small");
      metaLine.textContent = item.status + " | " + targetLabel + ": " + (displayDateTimeLocal(targetValue) || "belum diisi");

      row.append(title, desc, metaLine);
      container.appendChild(row);
    });
  }

  function isOpenStatus(status) {
    return equals(status, "Pending") || equals(status, "In Progress");
  }

  function openActivityLink(id) {
    state.activityFilters.search = id;
    localStorage.setItem("activityFilters", JSON.stringify(state.activityFilters));
    buildFilterBar("activity-filter-bar", state.activityFilters, renderAll, "activityFilters");
    showView("activities");
  }

  function renderNightAnalytics(data) {
    const night = data.filter((item) => equals(item.shift, "Night"));
    const nightSummary = getSummary(night);
    const incidents = night.filter((item) => equals(item.activityType, "Incident")).length;
    const productionImpacting = night.filter((item) => item.productionImpact && !equals(item.productionImpact, "No Impact")).length;
    renderMetricGrid(els["night-metric-grid"], [
      ["Night Activities", night.length, "Total activity shift malam"],
      ["Night Incidents", incidents, "Activity Type = Incident"],
      ["Night On-Site", nightSummary.onSite, "Support Mode = On-Site"],
      ["Night Remote", nightSummary.remote, "Support Mode = Remote"],
      ["Prod. Impact Night", productionImpacting, "Impact selain No Impact"],
      ["Avg Night Response", nightSummary.avgResponse, "Start - Report"],
      ["Avg Night Resolution", nightSummary.avgResolution, "Finish - Start"]
    ]);
    els["night-top-department"].textContent = topLabel(countBy(night, "department"));
    els["night-top-category"].textContent = topLabel(countBy(night, "category"));
  }

  function renderMetricGrid(container, metrics) {
    removeChildren(container);
    metrics.forEach(([label, value, help]) => {
      const card = document.createElement("div");
      card.className = "metric-card";
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      const valueEl = document.createElement("strong");
      valueEl.textContent = value || "0";
      const helpEl = document.createElement("small");
      helpEl.textContent = help || "";
      card.append(labelEl, valueEl, helpEl);
      container.appendChild(card);
    });
  }

  function renderCharts(data) {
    drawChart("chart-shift", "bar", orderedCounts(data, "shift", ["Morning", "Evening", "Night"]), ["#0f5e9c"], { indexAxis: "y" });
    drawChart("chart-support-mode", "bar", orderedCounts(data, "supportMode", ["On-Site", "Remote", "Hybrid", "N/A"]), ["#16834f"], { indexAxis: "y" });
    drawChart("chart-department", "bar", topEntries(countBy(data, "department"), 10), ["#0f5e9c"], { indexAxis: "y" });
    drawChart("chart-category", "bar", topEntries(countBy(data, "category"), 10), ["#6f7f1d"], { indexAxis: "y" });
    drawChart("chart-impact", "doughnut", countBy(data, "productionImpact"), ["#16834f", "#77a611", "#b26b00", "#d55a2a", "#c03744"]);
    drawChart("chart-plant", "doughnut", countBy(data, "plant"), ["#0f5e9c", "#16834f"]);
  }

  function drawChart(id, type, source, colors, options) {
    if (!window.Chart) return;
    const canvas = document.getElementById(id);
    const labels = Object.keys(source);
    const values = Object.values(source);
    if (state.charts[id]) state.charts[id].destroy();
    state.charts[id] = new Chart(canvas, {
      type,
      data: {
        labels: labels.length ? labels : ["No Data"],
        datasets: [{
          data: values.length ? values : [0],
          backgroundColor: (labels.length ? labels : ["No Data"]).map((label, index) => colors[index % colors.length]),
          borderWidth: 0
        }]
      },
      options: Object.assign({
        animation: false,
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
          legend: { display: type !== "bar", position: "bottom", labels: { boxWidth: 10, padding: 12 } },
          tooltip: { displayColors: false }
        },
        scales: type === "bar" ? {
          x: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: "rgba(102, 112, 133, 0.16)" } },
          y: { grid: { display: false }, ticks: { autoSkip: false } }
        } : {}
      }, options || {})
    });
  }

  function orderedCounts(data, key, order) {
    if (!data.length) return {};
    const source = countBy(data, key);
    const output = {};
    order.forEach((label) => {
      output[label] = source[label] || 0;
    });
    Object.keys(source).forEach((label) => {
      if (output[label] === undefined) output[label] = source[label];
    });
    return output;
  }

  function renderActivityTable() {
    const rows = filterActivities(state.activities, state.activityFilters);
    removeChildren(els["activity-table-body"]);
    rows.forEach((item) => {
      const tr = document.createElement("tr");
      [
        item.id, displayDate(item.date), item.itStaff, item.shift, item.plant, item.department, item.area, item.user,
        item.assetName, item.category, item.activityType, item.problem, item.actionTaken, item.supportMode,
        item.productionImpact, item.priority, formatTimes(item)
      ].forEach((value) => appendCell(tr, value));
      const statusTd = document.createElement("td");
      const badge = document.createElement("span");
      badge.className = "status-badge " + statusClass(item.status);
      badge.textContent = item.status || "-";
      statusTd.appendChild(badge);
      tr.appendChild(statusTd);
      const actionTd = document.createElement("td");
      actionTd.className = "no-print";
      const actions = document.createElement("div");
      actions.className = "row-actions";
      const edit = document.createElement("button");
      edit.type = "button";
      edit.title = "Edit";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editActivity(item.id));
      const wa = document.createElement("button");
      wa.type = "button";
      wa.title = "Share WhatsApp";
      wa.textContent = "WA";
      wa.addEventListener("click", () => shareActivityWhatsApp(item));
      const del = document.createElement("button");
      del.type = "button";
      del.title = "Delete";
      del.textContent = "Del";
      del.addEventListener("click", () => confirmDelete(item.id));
      actions.append(edit, wa, del);
      actionTd.appendChild(actions);
      tr.appendChild(actionTd);
      els["activity-table-body"].appendChild(tr);
    });
    els["empty-state"].classList.toggle("is-visible", rows.length === 0);
  }

  function shareActivityWhatsApp(item) {
    const lines = [
      "Pak Haris, activity sudah saya input:",
      "ID: " + (item.id || "-"),
      "Staff: " + (item.itStaff || "-"),
      "Department: " + (item.department || "-") + (item.area ? " / " + item.area : ""),
      "Problem: " + (item.problem || "-"),
      "Action: " + (item.actionTaken || "-"),
      "Status: " + (item.status || "-"),
      "Link: " + activityUrl(item.id)
    ];
    window.open("https://wa.me/" + HARIS_WHATSAPP_NUMBER + "?text=" + encodeURIComponent(lines.join("\n")), "_blank", "noopener");
  }

  function activityUrl(id) {
    const url = new URL(window.location.href);
    url.search = "?activity=" + encodeURIComponent(id || "");
    url.hash = "";
    return url.toString();
  }

  function renderReport() {
    const rows = filterActivities(state.activities, state.reportFilters);
    const summary = getSummary(rows);
    els["report-period"].textContent = "Period: " + reportPeriodText(state.reportFilters);
    renderReportSummary(summary);
    removeChildren(els["report-table-body"]);
    rows.forEach((item) => {
      const tr = document.createElement("tr");
      [displayDate(item.date), item.id, item.itStaff, item.shift, item.plant, item.department, item.area, item.user, item.problem, item.actionTaken, item.supportMode, item.status, item.responseTime, item.resolutionTime].forEach((value) => appendCell(tr, value));
      els["report-table-body"].appendChild(tr);
    });
  }

  function renderReportSummary(summary) {
    removeChildren(els["report-summary"]);
    [
      ["Total Activities", summary.total],
      ["Resolved", summary.resolved],
      ["Pending", summary.pending],
      ["On-Site", summary.onSite],
      ["Remote", summary.remote],
      ["Average Response", summary.avgResponse],
      ["Average Resolution", summary.avgResolution]
    ].forEach(([label, value]) => {
      const box = document.createElement("div");
      const labelEl = document.createElement("span");
      labelEl.textContent = label;
      const valueEl = document.createElement("strong");
      valueEl.textContent = value || "0";
      box.append(labelEl, valueEl);
      els["report-summary"].appendChild(box);
    });
  }

  function exportReport() {
    const rows = filterActivities(state.activities, state.reportFilters);
    if (!window.XLSX) {
      showToast("Library Excel belum selesai dimuat.", true);
      return;
    }
    if (!rows.length) {
      showToast("Tidak ada data sesuai filter untuk diexport.", true);
      return;
    }
    const data = rows.map((item) => ({
      ID: item.id,
      Date: displayDate(item.date),
      "IT Staff": item.itStaff,
      Shift: item.shift,
      Plant: item.plant,
      Department: item.department,
      "Area / Sub Department": item.area,
      User: item.user,
      Location: item.location,
      "Asset Name": item.assetName,
      "Device Type": item.deviceType,
      Category: item.category,
      "Activity Type": item.activityType,
      Problem: item.problem,
      "Action Taken": item.actionTaken,
      "Support Mode": item.supportMode,
      "Production Impact": item.productionImpact,
      Priority: item.priority,
      "Report Time": item.reportTime,
      "Start Time": item.startTime,
      "Finish Time": item.finishTime,
      "Response Time": item.responseTime,
      "Resolution Time": item.resolutionTime,
      "Root Cause Category": item.rootCauseCategory,
      "Root Cause Detail": item.rootCauseDetail,
      Status: item.status,
      Notes: item.notes,
      "Created At": item.createdAt,
      "Updated At": item.updatedAt
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    worksheet["!cols"] = Object.keys(data[0]).map((key) => ({ wch: Math.max(12, Math.min(36, key.length + 6)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Activities");
    XLSX.writeFile(workbook, "IT_Support_Daily_Activity_Report_" + jakartaDateInput(new Date()) + ".xlsx");
  }

  function filterActivities(list, filters) {
    return list.filter((item) => {
      if (filters.search) {
        const haystack = [item.id, item.itStaff, item.user, item.location, item.assetName, item.problem, item.actionTaken, item.notes].join(" ").toLowerCase();
        if (!haystack.includes(filters.search.toLowerCase())) return false;
      }
      if (filters.dateFrom && item.date < filters.dateFrom) return false;
      if (filters.dateTo && item.date > filters.dateTo) return false;
      return ["itStaff", "shift", "plant", "department", "area", "supportMode", "category", "status"].every((key) => !filters[key] || item[key] === filters[key]);
    });
  }

  function getSummary(rows) {
    const responseMinutes = rows.map((item) => durationToMinutes(item.responseTime)).filter((value) => value !== null);
    const resolutionMinutes = rows.map((item) => durationToMinutes(item.resolutionTime)).filter((value) => value !== null);
    const total = rows.length;
    const resolved = rows.filter((item) => equals(item.status, "Resolved")).length;
    const pending = rows.filter((item) => equals(item.status, "Pending")).length;
    return {
      total,
      resolved,
      pending,
      inProgress: rows.filter((item) => equals(item.status, "In Progress")).length,
      onSite: rows.filter((item) => equals(item.supportMode, "On-Site")).length,
      remote: rows.filter((item) => equals(item.supportMode, "Remote")).length,
      avgResponse: averageDuration(responseMinutes),
      avgResolution: averageDuration(resolutionMinutes),
      resolvedRate: total ? Math.round((resolved / total) * 100) : 0
    };
  }

  function countBy(rows, key) {
    return rows.reduce((acc, item) => {
      const value = item[key] || "Unspecified";
      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {});
  }

  function topEntries(source, limit) {
    return Object.fromEntries(Object.entries(source).sort((a, b) => b[1] - a[1]).slice(0, limit));
  }

  function topLabel(source) {
    const entries = Object.entries(source).sort((a, b) => b[1] - a[1]);
    return entries.length ? entries[0][0] + " (" + entries[0][1] + ")" : "-";
  }

  function averageDuration(minutes) {
    if (!minutes.length) return "00:00";
    return formatDuration(Math.round(minutes.reduce((sum, value) => sum + value, 0) / minutes.length));
  }

  function durationToMinutes(value) {
    const parsed = parseTime(value);
    return parsed === null ? null : parsed;
  }

  function appendCell(row, value) {
    const td = document.createElement("td");
    td.textContent = value || "-";
    row.appendChild(td);
  }

  function normalizeActivity(raw) {
    const item = {};
    const aliases = {
      id: ["id", "ID"],
      date: ["date", "Date"],
      itStaff: ["itStaff", "IT Staff"],
      shift: ["shift", "Shift"],
      plant: ["plant", "Plant"],
      department: ["department", "Department"],
      area: ["area", "Area / Sub Department"],
      user: ["user", "User"],
      location: ["location", "Location"],
      assetName: ["assetName", "Asset Name"],
      deviceType: ["deviceType", "Device Type"],
      category: ["category", "Category"],
      activityType: ["activityType", "Activity Type"],
      problem: ["problem", "Problem"],
      actionTaken: ["actionTaken", "Action Taken"],
      supportMode: ["supportMode", "Support Mode"],
      productionImpact: ["productionImpact", "Production Impact"],
      priority: ["priority", "Priority"],
      reportTime: ["reportTime", "Report Time"],
      startTime: ["startTime", "Start Time"],
      finishTime: ["finishTime", "Finish Time"],
      responseTime: ["responseTime", "Response Time"],
      resolutionTime: ["resolutionTime", "Resolution Time"],
      rootCauseCategory: ["rootCauseCategory", "Root Cause Category"],
      rootCauseDetail: ["rootCauseDetail", "Root Cause Detail"],
      status: ["status", "Status"],
      notes: ["notes", "Notes"],
      createdAt: ["createdAt", "Created At"],
      updatedAt: ["updatedAt", "Updated At"]
    };
    Object.keys(aliases).forEach((key) => {
      const found = aliases[key].find((alias) => raw[alias] !== undefined);
      item[key] = found ? String(raw[found] || "") : "";
    });
    item.date = normalizeDateInput(item.date);
    if (!item.responseTime) item.responseTime = calculateDuration(item.reportTime, item.startTime);
    if (!item.resolutionTime) item.resolutionTime = calculateDuration(item.startTime, item.finishTime);
    return item;
  }

  function normalizeDateInput(value) {
    if (!value) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
    const dmy = String(value).match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
    if (dmy) return dmy[3] + "-" + dmy[2].padStart(2, "0") + "-" + dmy[1].padStart(2, "0");
    return value.slice(0, 10);
  }

  function displayDate(value) {
    const normalized = normalizeDateInput(value);
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    return match ? match[3] + "/" + match[2] + "/" + match[1] : normalized;
  }

  function formatTimes(item) {
    const times = [item.reportTime, item.startTime, item.finishTime].filter(Boolean).join(" / ");
    return (times ? times + " WIB" : "") + (item.responseTime || item.resolutionTime ? " | R " + (item.responseTime || "-") + " / " + (item.resolutionTime || "-") : "");
  }

  function appendLine(text, line) {
    const base = String(text || "").trim();
    const next = String(line || "").trim();
    if (!next) return base;
    return base ? base + "\n" + next : next;
  }

  function positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  function composeNotes(notes, meta) {
    const cleanNotes = parseNoteMeta(notes).cleanNotes.trim();
    const lines = [];
    if (meta.followUpTarget) lines.push("Target Gas: " + meta.followUpTarget);
    if (meta.finishTarget) lines.push("Target Selesai: " + meta.finishTarget);
    if (!lines.length) return cleanNotes;
    return lines.join("\n") + (cleanNotes ? "\n\n" + cleanNotes : "");
  }

  function parseNoteMeta(notes) {
    const lines = String(notes || "").split(/\r?\n/);
    const meta = { followUpTarget: "", finishTarget: "", cleanNotes: "" };
    const clean = [];
    lines.forEach((line) => {
      const follow = line.match(/^Target Gas:\s*(.+)$/i);
      const finish = line.match(/^Target Selesai:\s*(.+)$/i);
      if (follow) {
        meta.followUpTarget = normalizeDateTimeLocal(follow[1]);
      } else if (finish) {
        meta.finishTarget = normalizeDateTimeLocal(finish[1]);
      } else {
        clean.push(line);
      }
    });
    meta.cleanNotes = clean.join("\n").trim();
    return meta;
  }

  function normalizeDateTimeLocal(value) {
    const text = String(value || "").trim();
    const match = text.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2})/);
    return match ? match[1] + "T" + match[2] : "";
  }

  function displayDateTimeLocal(value) {
    const normalized = normalizeDateTimeLocal(value);
    if (!normalized) return "";
    const match = normalized.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}:\d{2})$/);
    return match ? match[3] + "/" + match[2] + "/" + match[1] + " " + match[4] + " WIB" : normalized + " WIB";
  }

  function statusClass(status) {
    if (equals(status, "Resolved")) return "status-resolved";
    if (equals(status, "In Progress")) return "status-in-progress";
    if (equals(status, "Pending")) return "status-pending";
    return "";
  }

  function reportPeriodText(filters) {
    if (filters.dateFrom && filters.dateTo) return displayDate(filters.dateFrom) + " - " + displayDate(filters.dateTo);
    if (filters.dateFrom) return "From " + displayDate(filters.dateFrom);
    if (filters.dateTo) return "Until " + displayDate(filters.dateTo);
    return "All dates";
  }

  function formatWibDateTime(value) {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);
    return new Intl.DateTimeFormat("id-ID", {
      timeZone: TZ,
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(date) + " WIB";
  }

  function updateDashboardFilters() {
    state.dashboardFilters.dateFrom = els["dashboard-date-from"].value;
    state.dashboardFilters.dateTo = els["dashboard-date-to"].value;
    localStorage.setItem("dashboardFilters", JSON.stringify(state.dashboardFilters));
    renderDashboard();
  }

  function resetDashboardFilters() {
    state.dashboardFilters = {};
    localStorage.removeItem("dashboardFilters");
    syncDashboardFilterInputs();
    renderDashboard();
  }

  function syncDashboardFilterInputs() {
    els["dashboard-date-from"].value = state.dashboardFilters.dateFrom || "";
    els["dashboard-date-to"].value = state.dashboardFilters.dateTo || "";
  }

  function setSyncState(label, mode) {
    els["sync-state"].textContent = label;
    els["sync-state"].className = "sync-state" + (mode ? " " + mode : "");
  }

  function showToast(message, error) {
    els.toast.textContent = message;
    els.toast.classList.toggle("is-error", Boolean(error));
    els.toast.classList.add("is-visible");
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => els.toast.classList.remove("is-visible"), 3400);
  }

  function removeChildren(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function unique(values) {
    return Array.from(new Set(values.filter(Boolean))).sort();
  }

  function equals(a, b) {
    return String(a || "").toLowerCase() === String(b || "").toLowerCase();
  }

  function jakartaDateInput(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return parts.year + "-" + parts.month + "-" + parts.day;
  }

  function jakartaTimeInput(date) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: TZ,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date).reduce((acc, part) => {
      acc[part.type] = part.value;
      return acc;
    }, {});
    return parts.hour + ":" + parts.minute;
  }

  function loadFilterPreference(key) {
    try {
      return JSON.parse(localStorage.getItem(key) || "{}") || {};
    } catch (error) {
      return {};
    }
  }
})();
