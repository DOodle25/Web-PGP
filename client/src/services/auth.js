import { api } from "./api";

const TOKEN_KEY = "kleo_token";
const EXPIRY_KEY = "kleo_token_exp";

export const saveToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
};

export const saveExpiry = (expiresAt) => {
  if (expiresAt) {
    localStorage.setItem(EXPIRY_KEY, expiresAt);
  }
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);

export const getExpiry = () => {
  const value = localStorage.getItem(EXPIRY_KEY);
  return value ? Number(value) : null;
};

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(EXPIRY_KEY);
};

export const saveSession = ({ token, expiresAt }) => {
  saveToken(token);
  saveExpiry(expiresAt);
};

export const login = async (email, password) => {
  const data = await api.login({ email, password });
  saveSession({ token: data.token, expiresAt: data.expiresAt });
  return data;
};

export const register = async (email, password) => {
  const data = await api.register({ email, password });
  saveSession({ token: data.token, expiresAt: data.expiresAt });
  return data;
};

export const refreshSession = async () => {
  const data = await api.refresh();
  saveSession({ token: data.token, expiresAt: data.expiresAt });
  return data;
};

export const logoutSession = async () => {
  await api.logout();
  clearToken();
};
