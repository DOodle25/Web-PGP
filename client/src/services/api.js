const API_URL = 
// "http://localhost:5000";
  import.meta.env.VITE_API_URL ||
  "https://web-pgp-backend-bgb0fxakaudhdufu.westindia-01.azurewebsites.net";

const request = async (path, { method = "GET", body, token } = {}) => {
  const headers = { "Content-Type": "application/json" };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "Request failed" }));
    throw new Error(error.message || "Request failed");
  }

  return response.json();
};

export const api = {
  register: (payload) =>
    request("/api/auth/register", { method: "POST", body: payload }),
  login: (payload) =>
    request("/api/auth/login", { method: "POST", body: payload }),
  me: (token) => request("/api/auth/me", { token }),
  logoutAll: (token) =>
    request("/api/auth/logout-all", { method: "POST", token }),
  logout: () => request("/api/auth/logout", { method: "POST" }),
  refresh: () => request("/api/auth/refresh", { method: "POST" }),
  listKeys: (token) => request("/api/keys", { token }),
  saveKey: (token, payload) =>
    request("/api/keys", { method: "POST", token, body: payload }),
  updateKey: (token, id, payload) =>
    request(`/api/keys/${id}`, { method: "PATCH", token, body: payload }),
  deleteKey: (token, id) =>
    request(`/api/keys/${id}`, { method: "DELETE", token }),
  addAudit: (token, payload) =>
    request("/api/crypto/audit", { method: "POST", token, body: payload }),
  getHistory: (token) => request("/api/crypto/history", { token }),
};
