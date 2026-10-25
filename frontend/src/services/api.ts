import axios from "axios";

/**
 * Resolves the backend API base URL:
 * 1. If VITE_API_URL is configured (e.g. https://agriledger-ai.onrender.com),
 *    normalizes trailing slashes and ensures /api path without duplication.
 * 2. In local development (import.meta.env.DEV), defaults to http://localhost:5000/api.
 * 3. In production builds without VITE_API_URL, falls back to relative /api
 *    to prevent silently sending production traffic to localhost.
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

  return "/api";
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

export default api;