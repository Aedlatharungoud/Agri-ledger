import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./index.css";
import "./App.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";


/* ============================================================
   AG R I L E D G E R   API CONFIGURATION
============================================================ */

const API_BASE_URL = "http://localhost:5000";


/* ============================================================
   GLOBAL FETCH CONFIGURATION
============================================================

   Existing AgriLedger pages use fetch() directly.

   This wrapper guarantees that:

   1. All API requests use localhost:5000
   2. All API requests include Flask session cookies
   3. We do not accidentally mix:
        localhost
        127.0.0.1

   This is important because browser cookies are
   host-specific.
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
    requestUrl.includes("/api/");


  if (isApiRequest) {

    let normalizedInput: RequestInfo | URL = input;


    /* --------------------------------------------------------
       Normalize API hostname

       Convert:

       127.0.0.1:5000/api/...
       
       to:

       localhost:5000/api/...
    -------------------------------------------------------- */

    if (
      requestUrl.startsWith(
        "http://127.0.0.1:5000"
      )
    ) {

      const normalizedUrl =
        requestUrl.replace(
          "http://127.0.0.1:5000",
          API_BASE_URL
        );

      normalizedInput =
        new Request(
          normalizedUrl,
          input instanceof Request
            ? input
            : undefined
        );
    }


    /* --------------------------------------------------------
       Convert relative API URL to localhost backend
    -------------------------------------------------------- */

    else if (
      requestUrl.startsWith("/api/")
    ) {

      normalizedInput =
        `${API_BASE_URL}${requestUrl}`;
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