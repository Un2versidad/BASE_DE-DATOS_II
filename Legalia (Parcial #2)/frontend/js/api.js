const API_BASE = window.__API_BASE__ || "http://localhost:5001";
const ACCESS_KEY = "access_token";
const REFRESH_KEY = "refresh_token";
const USER_KEY = "user_profile";

function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY);
}

function setTokens(accessToken, refreshToken) {
  if (accessToken) {
    localStorage.setItem(ACCESS_KEY, accessToken);
  }
  if (refreshToken) {
    localStorage.setItem(REFRESH_KEY, refreshToken);
  }
}

async function refreshAccessToken() {
  const refreshToken = localStorage.getItem(REFRESH_KEY);
  if (!refreshToken) {
    return null;
  }
  const response = await fetch(`${API_BASE}/api/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  setTokens(data.access_token, null);
  return data.access_token;
}

async function apiFetch(path, options = {}) {
  const headers = options.headers || {};
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch(path, options);
    }
    logout();
    return null;
  }

  if (!response.ok) {
    return null;
  }
  return response.json();
}

async function apiFetchDetailed(path, options = {}) {
  const headers = options.headers || {};
  const token = getAccessToken();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetchDetailed(path, options);
    }
    logout();
    return { ok: false, status: 401, data: null };
  }

  let data = null;
  try {
    data = await response.json();
  } catch (err) {
    data = null;
  }

  return { ok: response.ok, status: response.status, data };
}

async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!response.ok) {
    return null;
  }
  const data = await response.json();
  setTokens(data.access_token, data.refresh_token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user || {}));
  return data;
}

function logout() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
  window.location = "login.html";
}

async function getAseguradoras() {
  return apiFetch("/api/aseguradoras");
}

async function createAseguradora(nombre) {
  return apiFetchDetailed("/api/aseguradoras", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

async function updateAseguradora(id, nombre) {
  return apiFetchDetailed(`/api/aseguradoras/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

async function deleteAseguradora(id) {
  return apiFetchDetailed(`/api/aseguradoras/${id}`, {
    method: "DELETE",
  });
}

async function getJuzgados() {
  return apiFetch("/api/juzgados");
}

async function createJuzgado(nombre) {
  return apiFetchDetailed("/api/juzgados", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

async function updateJuzgado(id, nombre) {
  return apiFetchDetailed(`/api/juzgados/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ nombre }),
  });
}

async function deleteJuzgado(id) {
  return apiFetchDetailed(`/api/juzgados/${id}`, {
    method: "DELETE",
  });
}

async function getExpedientes() {
  return apiFetch("/api/expedientes");
}

async function createExpediente(payload) {
  return apiFetchDetailed("/api/expedientes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function updateExpediente(id, payload) {
  return apiFetchDetailed(`/api/expedientes/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function deleteExpediente(id) {
  return apiFetchDetailed(`/api/expedientes/${id}`, {
    method: "DELETE",
  });
}

async function getReportSummary() {
  return apiFetchDetailed("/api/reports/summary");
}

async function getProfile() {
  return apiFetchDetailed("/api/me");
}
