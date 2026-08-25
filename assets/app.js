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
    activities: "/api/activities"
  };

  const FALLBACK_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwQ5HEhd_JPr6HtGo0Knnf4thEHK2kOqME_aFQRygi7NtM1SR6wQzhAFIk5oIks_NjM7g/exec";
  const MASTER_KEYS = ["shift", "plant", "department", "activityType", "supportMode", "productionImpact", "priority", "status", "deviceType", "category", "rootCauseCategory"];
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
    charts: {},
    pendingDeleteId: null
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
      "activity-form", "activity-id", "submit-button", "cancel-edit-button", "department", "area", "itStaff", "plant",
      "reportTime", "startTime", "finishTime", "responseTime", "resolutionTime", "activity-table-body", "empty-state",
      "report-table-body", "report-summary", "report-period", "toast", "confirm-dialog", "confirm-cancel", "confirm-ok",
      "dashboard-date-from", "dashboard-date-to", "dashboard-reset", "export-button", "print-button", "login-screen",
      "login-form", "login-username", "login-password", "login-button", "login-error", "menu-toggle", "menu-panel",
      "theme-light", "theme-dark", "logout-button", "admin-tab", "admin-user-form", "admin-user-id", "admin-username",
      "admin-display-name", "admin-role", "admin-password", "admin-is-active", "admin-reset-form", "admin-save-user",
      "admin-users-body"
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
      showView(defaultView());
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
      showView(defaultView());
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

  function defaultView() {
    return state.currentUser.role === "admin" ? "dashboard" : "add";
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
      const data = await fetchJson(API.activities, "activities");
      state.activities = Array.isArray(data) ? data.map(normalizeActivity) : [];
      renderAll();
      setSyncState("Online", "ok");
      if (manual) showToast("Data activity diperbarui dari spreadsheet.");
    } catch (error) {
      state.activities = [];
      renderAll();
      setSyncState("API setup", "error");
      showToast(error.message || "Activities API belum tersedia", true);
    }
  }

  async function fetchJson(url, publicAction) {
    try {
      const response = await fetch(url, { headers: authHeaders({ Accept: "application/json" }) });
      if (response.status === 401) {
        logout(false);
        throw new Error("Session login habis. Silakan login lagi.");
      }
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (!payload.success) throw new Error(payload.error || "API request failed");
      return payload.data;
    } catch (error) {
      if (publicAction && publicAction !== "activities") {
        const fallback = await fetch(FALLBACK_SCRIPT_URL + "?action=" + encodeURIComponent(publicAction));
        const payload = await fallback.json();
        if (!payload.success) throw new Error(payload.error || "Fallback API failed");
        return payload.data;
      }
      throw error;
    }
  }

  function normalizeMaster(master) {
    const defaults = {
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
    if (view === "admin") loadUsers();
  }

  async function saveActivity(event) {
    event.preventDefault();
    const activity = formToActivity();
    const id = els["activity-id"].value;
    const method = id ? "PUT" : "POST";
    const buttonText = els["submit-button"].textContent;
    els["submit-button"].disabled = true;
    els["submit-button"].textContent = id ? "Updating..." : "Saving...";
    try {
      const response = await fetch(API.activities, {
        method,
        headers: authHeaders({ "Content-Type": "application/json", Accept: "application/json" }),
        body: JSON.stringify(id ? Object.assign({ id }, activity) : activity)
      });
      const payload = await response.json();
      if (!response.ok || !payload.success) throw new Error(payload.error || "Save failed");
      showToast(id ? "Activity berhasil diperbarui." : "Activity tersimpan: " + payload.data.id);
      resetForm();
      await loadActivities(false);
      showView("activities");
    } catch (error) {
      showToast(error.message, true);
    } finally {
      els["submit-button"].disabled = false;
      els["submit-button"].textContent = buttonText;
    }
  }

  function formToActivity() {
    const data = {};
    ["reportTime", "startTime", "finishTime"].forEach(normalizeTimeInput);
    ["date", "itStaff", "shift", "plant", "department", "area", "user", "location", "assetName", "deviceType", "category", "activityType", "problem", "actionTaken", "supportMode", "productionImpact", "priority", "reportTime", "startTime", "finishTime", "rootCauseCategory", "rootCauseDetail", "status", "notes"].forEach((key) => {
      data[key] = (document.getElementById(key).value || "").trim();
    });
    data.responseTime = calculateDuration(data.reportTime, data.startTime);
    data.resolutionTime = calculateDuration(data.startTime, data.finishTime);
    return data;
  }

  function resetForm() {
    els["activity-form"].reset();
    els["activity-id"].value = "";
    els["submit-button"].textContent = "Save Activity";
    document.getElementById("form-title").textContent = "Add Activity";
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
    Object.keys(activity).forEach((key) => {
      const input = document.getElementById(key);
      if (input && key !== "area") input.value = activity[key] || "";
    });
    populateAreaSelect(activity.department, activity.area);
    els["submit-button"].textContent = "Update Activity";
    updateDurationPreview();
  }

  function confirmDelete(id) {
    state.pendingDeleteId = id;
    els["confirm-dialog"].classList.remove("hidden");
  }

  function closeConfirm() {
    state.pendingDeleteId = null;
    els["confirm-dialog"].classList.add("hidden");
  }

  async function executeDelete() {
    if (!state.pendingDeleteId) return;
    const id = state.pendingDeleteId;
    closeConfirm();
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
      const edit = document.createElement("button");
      edit.className = "secondary-button";
      edit.type = "button";
      edit.textContent = "Edit";
      edit.addEventListener("click", () => editUser(user));
      action.appendChild(edit);
      tr.appendChild(action);
      els["admin-users-body"].appendChild(tr);
    });
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
    els["admin-save-user"].textContent = "Save User";
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
    renderCharts(data);
    renderNightAnalytics(data);
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
    drawChart("chart-shift", "bar", countBy(data, "shift"), ["#0f5e9c", "#6f7f1d", "#25364a"]);
    drawChart("chart-support-mode", "doughnut", countBy(data, "supportMode"), ["#16834f", "#0f5e9c", "#b26b00", "#667085"]);
    drawChart("chart-department", "bar", topEntries(countBy(data, "department"), 10), ["#0f5e9c"]);
    drawChart("chart-category", "bar", topEntries(countBy(data, "category"), 10), ["#6f7f1d"]);
    drawChart("chart-impact", "doughnut", countBy(data, "productionImpact"), ["#16834f", "#77a611", "#b26b00", "#d55a2a", "#c03744"]);
    drawChart("chart-plant", "doughnut", countBy(data, "plant"), ["#0f5e9c", "#16834f"]);
  }

  function drawChart(id, type, source, colors) {
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
          backgroundColor: colors,
          borderWidth: 0
        }]
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: type !== "bar", position: "bottom" } },
        scales: type === "bar" ? { y: { beginAtZero: true, ticks: { precision: 0 } } } : {}
      }
    });
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
      const del = document.createElement("button");
      del.type = "button";
      del.title = "Delete";
      del.textContent = "Del";
      del.addEventListener("click", () => confirmDelete(item.id));
      actions.append(edit, del);
      actionTd.appendChild(actions);
      tr.appendChild(actionTd);
      els["activity-table-body"].appendChild(tr);
    });
    els["empty-state"].classList.toggle("is-visible", rows.length === 0);
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
