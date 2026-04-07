import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "";

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
});

// Wstrzykuj nagłówek Authorization z localStorage
api.interceptors.request.use((config) => {
  const creds = localStorage.getItem("auth");
  if (creds) {
    config.headers.Authorization = `Basic ${creds}`;
  }
  return config;
});

// Globalna obsługa 401 → przekieruj na login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("auth");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default api;

// ─── Wydatki ─────────────────────────────────────────────────────────────────

export const getWydatki = () => api.get("/api/wydatki").then((r) => r.data);
export const createWydatek = (data) => api.post("/api/wydatki", data).then((r) => r.data);
export const updateWydatek = (id, data) => api.put(`/api/wydatki/${id}`, data).then((r) => r.data);
export const deleteWydatek = (id) => api.delete(`/api/wydatki/${id}`);

// ─── Spłaty ──────────────────────────────────────────────────────────────────

export const getSplaty = () => api.get("/api/splaty").then((r) => r.data);
export const createSplata = (data) => api.post("/api/splaty", data).then((r) => r.data);
export const updateSplata = (id, data) => api.put(`/api/splaty/${id}`, data).then((r) => r.data);
export const deleteSplata = (id) => api.delete(`/api/splaty/${id}`);

// ─── Inflacja ─────────────────────────────────────────────────────────────────

export const getInflacja = () => api.get("/api/inflacja").then((r) => r.data);
export const upsertInflacja = (data) => api.post("/api/inflacja", data).then((r) => r.data);
export const odswiezInflacje = () => api.post("/api/inflacja/odswiez").then((r) => r.data);

// ─── Obliczenia ───────────────────────────────────────────────────────────────

export const przelicz = () => api.get("/api/przelicz").then((r) => r.data);

// ─── Eksport ──────────────────────────────────────────────────────────────────

export const eksportCsv = () => {
  const creds = localStorage.getItem("auth");
  const headers = creds ? { Authorization: `Basic ${creds}` } : {};
  return api.get("/api/eksport/csv", { responseType: "blob", headers });
};

export const eksportXlsx = () => {
  const creds = localStorage.getItem("auth");
  const headers = creds ? { Authorization: `Basic ${creds}` } : {};
  return api.get("/api/eksport/xlsx", { responseType: "blob", headers });
};

export const importXlsx = (formData) =>
  api.post("/api/import/xlsx", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  }).then((r) => r.data);
