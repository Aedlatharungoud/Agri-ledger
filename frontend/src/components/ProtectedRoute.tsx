import {
  Navigate,
  Outlet,
  useLocation,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";

type UserRole = "ADMIN" | "FARMER";

interface ProtectedRouteProps {
  allowedRoles?: UserRole[];
}

function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // ------------------------------------------------------------
  // CHECKING LOGIN SESSION
  // ------------------------------------------------------------

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: "12px",
          fontFamily: "Arial, sans-serif",
          fontSize: "18px",
        }}
      >
        <div
          style={{
            fontSize: "42px",
          }}
        >
          🌾
        </div>

        <div
          style={{
            fontWeight: 700,
            color: "#166534",
          }}
        >
          Loading AgriLedger AI...
        </div>

        <div
          style={{
            fontSize: "14px",
            color: "#64748b",
          }}
        >
          Checking authentication...
        </div>
      </div>
    );
  }

  // ------------------------------------------------------------
  // USER IS NOT LOGGED IN
  // ------------------------------------------------------------

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    );
  }

  // ------------------------------------------------------------
  // ROLE AUTHORIZATION
  // ------------------------------------------------------------

  if (
    allowedRoles &&
    allowedRoles.length > 0
  ) {
    const userRole =
      String(user.role).toUpperCase() as UserRole;

    if (!allowedRoles.includes(userRole)) {
      // ADMIN trying to access a farmer-only page
      if (userRole === "ADMIN") {
        return (
          <Navigate
            to="/admin"
            replace
          />
        );
      }

      // FARMER trying to access an admin-only page
      if (userRole === "FARMER") {
        return (
          <Navigate
            to="/farmer-dashboard"
            replace
          />
        );
      }

      // Unknown role
      return (
        <Navigate
          to="/login"
          replace
        />
      );
    }
  }

  // ------------------------------------------------------------
  // ACCESS GRANTED
  // ------------------------------------------------------------

  return <Outlet />;
}

export default ProtectedRoute;