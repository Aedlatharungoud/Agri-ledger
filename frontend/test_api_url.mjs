import assert from "node:assert";
import test from "node:test";

const DEFAULT_PROD_API_URL = "https://agriledger-ai-backend.onrender.com";

// Mirrors getApiBaseUrl logic from frontend/src/services/api.ts
function resolveApiBaseUrl({ viteApiUrl = "", isDev = false }) {
  const envUrl = (viteApiUrl || "").trim();

  if (envUrl) {
    const trimmed = envUrl.replace(/\/+$/, "");
    return trimmed.endsWith("/api") ? trimmed : `${trimmed}/api`;
  }

  if (isDev) {
    return "http://localhost:5000/api";
  }

  return `${DEFAULT_PROD_API_URL}/api`;
}

// Mirrors request interceptor from frontend/src/services/api.ts
function deduplicateApiPath(url) {
  if (url && url.startsWith("/api/")) {
    return url.slice(4);
  }
  return url;
}

test("1. Local dev mode defaults to localhost:5000/api", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: true });
  assert.strictEqual(base, "http://localhost:5000/api");
});

test("2. Production mode without VITE_API_URL defaults to Render backend", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: false });
  assert.strictEqual(base, "https://agriledger-ai-backend.onrender.com/api");
});

test("3. Production mode login endpoint constructs correct URL", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: false });
  const path = deduplicateApiPath("/auth/login");
  const loginUrl = `${base}${path}`;
  assert.strictEqual(loginUrl, "https://agriledger-ai-backend.onrender.com/api/auth/login");
});

test("4. Production mode logout endpoint constructs correct URL", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: false });
  const path = deduplicateApiPath("/auth/logout");
  const logoutUrl = `${base}${path}`;
  assert.strictEqual(logoutUrl, "https://agriledger-ai-backend.onrender.com/api/auth/logout");
});

test("5. Production mode session check endpoint (/auth/me) constructs correct URL", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: false });
  const path = deduplicateApiPath("/auth/me");
  const meUrl = `${base}${path}`;
  assert.strictEqual(meUrl, "https://agriledger-ai-backend.onrender.com/api/auth/me");
});

test("6. Duplicate /api path is safely stripped by interceptor logic", () => {
  const base = resolveApiBaseUrl({ viteApiUrl: "", isDev: false });
  const strippedPath = deduplicateApiPath("/api/auth/login");
  assert.strictEqual(strippedPath, "/auth/login");
  const finalUrl = `${base}${strippedPath}`;
  assert.strictEqual(finalUrl, "https://agriledger-ai-backend.onrender.com/api/auth/login");
});

test("7. Explicit VITE_API_URL without /api is normalized properly", () => {
  const base = resolveApiBaseUrl({
    viteApiUrl: "https://custom-backend.onrender.com",
    isDev: false,
  });
  assert.strictEqual(base, "https://custom-backend.onrender.com/api");
});

test("8. Explicit VITE_API_URL with trailing slash is normalized properly", () => {
  const base = resolveApiBaseUrl({
    viteApiUrl: "https://custom-backend.onrender.com/",
    isDev: false,
  });
  assert.strictEqual(base, "https://custom-backend.onrender.com/api");
});

test("9. Explicit VITE_API_URL with /api does not create duplicate /api/api", () => {
  const base = resolveApiBaseUrl({
    viteApiUrl: "https://custom-backend.onrender.com/api",
    isDev: false,
  });
  assert.strictEqual(base, "https://custom-backend.onrender.com/api");

  const baseSlash = resolveApiBaseUrl({
    viteApiUrl: "https://custom-backend.onrender.com/api/",
    isDev: false,
  });
  assert.strictEqual(baseSlash, "https://custom-backend.onrender.com/api");
});
