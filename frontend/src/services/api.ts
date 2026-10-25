import axios from "axios";

export const DEFAULT_PROD_API_URL = "https://agriledger-ai-backend.onrender.com";

/**
 * Resolves the backend API base URL:
 * 1. If VITE_API_URL is configured (e.g. https://agriledger-ai-backend.onrender.com),
 *    normalizes trailing slashes and ensures /api path without duplication.
 * 2. In local development (import.meta.env.DEV), defaults to http://localhost:5000/api.
 * 3. In production builds where VITE_API_URL is unset, defaults to the deployed
 *    Render backend (https://agriledger-ai-backend.onrender.com/api) to prevent
 *    sending API traffic to the Vercel frontend host (which causes 405 Method Not Allowed).
 */
export function getApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_URL || "").trim();

  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  if (import.meta.env.DEV) {
    return "http://localhost:5000/api";
  }

  return `${DEFAULT_PROD_API_URL}/api`;
}

const api = axios.create({
  baseURL: getApiBaseUrl(),

  /*
   * Required for Flask session cookies.
   */
  withCredentials: true,

  headers: {
    "Content-Type": "application/json",
  },
});

/**
 * Request interceptor to prevent duplicate `/api/api/...` paths if a caller
 * passes a path that already begins with `/api/`.
 */
api.interceptors.request.use((config) => {
  if (config.url && config.url.startsWith("/api/")) {
    config.url = config.url.slice(4);
  }
  return config;
});

export default api;