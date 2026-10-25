import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./index.css";
import "./App.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";


/* ============================================================
   AGRILEDGER API CONFIGURATION
============================================================ */

const rawApiUrl = (import.meta.env.VITE_API_URL || "").trim().replace(/\/+$/, "");
const API_BASE_URL = rawApiUrl
  ? (rawApiUrl.endsWith("/api") ? rawApiUrl.slice(0, -4) : rawApiUrl)
  : (import.meta.env.DEV ? "http://localhost:5000" : "");


/* ============================================================
   GLOBAL FETCH CONFIGURATION
============================================================

   Wrapper for fetch() to ensure:
   1. Requests route to configured API_BASE_URL (or relative in prod)
   2. Flask session cookies are sent with credentials: "include"
   3. localhost/127.0.0.1 hostnames are normalized
============================================================ */

const originalFetch = window.fetch.bind(window);


window.fetch = (
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> => {

  let requestUrl = "";

  /* ----------------------------------------------------------
     Get requested URL
  ---------------------------------------------------------- */

  if (typeof input === "string") {
    requestUrl = input;
  } else if (input instanceof URL) {
    requestUrl = input.toString();
  } else {
    requestUrl = input.url;
  }


  /* ----------------------------------------------------------
     Detect AgriLedger API request
  ---------------------------------------------------------- */

  const isApiRequest =
    requestUrl.startsWith("/api/") ||
    requestUrl.startsWith("http://127.0.0.1:5000") ||
    requestUrl.startsWith("http://localhost:5000") ||
    (Boolean(API_BASE_URL) && requestUrl.startsWith(API_BASE_URL));


  if (isApiRequest) {
    let normalizedInput: RequestInfo | URL = input;

    /* --------------------------------------------------------
       Normalize API hostname
    -------------------------------------------------------- */

    if (
      requestUrl.startsWith("http://127.0.0.1:5000") ||
      (API_BASE_URL && requestUrl.startsWith("http://localhost:5000"))
    ) {
      const targetHost = API_BASE_URL || "http://localhost:5000";
      const normalizedUrl = requestUrl
        .replace("http://127.0.0.1:5000", targetHost)
        .replace("http://localhost:5000", targetHost);

      normalizedInput =
        new Request(
          normalizedUrl,
          input instanceof Request
            ? input
            : undefined
        );
    }

    /* --------------------------------------------------------
       Convert relative API URL to backend host
    -------------------------------------------------------- */

    else if (requestUrl.startsWith("/api/")) {
      normalizedInput = API_BASE_URL ? `${API_BASE_URL}${requestUrl}` : requestUrl;
    }

    /* --------------------------------------------------------
       Make sure Flask session cookie is sent
    -------------------------------------------------------- */

    const updatedInit: RequestInit = {
      ...init,
      credentials:
        init?.credentials ?? "include",
    };

    return originalFetch(
      normalizedInput,
      updatedInit
    );
  }

  /* ==========================================================
     NON-API REQUEST
  ========================================================== */

  return originalFetch(
    input,
    init
  );
};


/* ============================================================
   START REACT APPLICATION
============================================================ */

createRoot(
  document.getElementById("root")!
).render(

  <StrictMode>

    <AuthProvider>

      <App />

    </AuthProvider>

  </StrictMode>

);