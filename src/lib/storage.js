export const STORAGE_KEYS = {
  users: "phishlab.users.v4",
  session: "phishlab.session.v4",
  attempts: "phishlab.attempts.v4",
  campaigns: "phishlab.campaigns.v4",
  settings: "phishlab.settings.v4",
  adminUsers: "phishlab.adminUsers.v4",
};

export function readStorage(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function formatDate(value) {
  return new Date(value).toLocaleString("ru-RU");
}

const API_BASE_URL = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");

async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(data?.error || "API request failed");
  }
  return data;
}

export async function hydrateAppStorage() {
  const data = await apiRequest("/db-api/bootstrap");
  writeStorage(STORAGE_KEYS.users, data.users || []);
  writeStorage(STORAGE_KEYS.attempts, data.attempts || []);
  return data;
}

export async function migrateLegacyStorageToServer() {
  const users = readStorage(STORAGE_KEYS.users, []);
  const attempts = readStorage(STORAGE_KEYS.attempts, []);

  if (users.length === 0 && attempts.length === 0) return null;

  const data = await apiRequest("/db-api/migrate", {
    method: "POST",
    body: JSON.stringify({ users, attempts }),
  });

  writeStorage(STORAGE_KEYS.users, data.users || []);
  writeStorage(STORAGE_KEYS.attempts, data.attempts || []);
  return data;
}

export async function registerUser(payload) {
  const data = await apiRequest("/db-api/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function loginUser(payload) {
  const data = await apiRequest("/db-api/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function updateUser(userId, payload) {
  const data = await apiRequest(`/db-api/users/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
  return data.user;
}

export async function deleteUser(userId) {
  await apiRequest(`/db-api/users/${userId}`, {
    method: "DELETE",
  });
}

export async function saveAttempt(attempt) {
  const data = await apiRequest("/db-api/attempts", {
    method: "POST",
    body: JSON.stringify({ attempt }),
  });
  return data.attempt;
}
