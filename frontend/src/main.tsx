import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "./styles/tokens.css";
import "./index.css";
import "./App.css";
import App from "./App.tsx";

import { AuthProvider } from "./context/AuthContext";




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