import { useState } from "react";
import {
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import "./MainLayout.css";

interface NavigationItem {
  name: string;
  path: string;
  icon: string;
}

/* =========================================================
   ADMIN NAVIGATION
========================================================= */

const adminNavigation: NavigationItem[] = [
  { name: "Admin Dashboard", path: "/admin", icon: "🧑‍💼" },
  { name: "Farmers", path: "/farmers", icon: "👨‍🌾" },
  { name: "Fields", path: "/fields", icon: "🌱" },
  { name: "Crop Seasons", path: "/crop-seasons", icon: "🌾" },
  { name: "Products", path: "/products", icon: "📦" },
  { name: "Input Purchases", path: "/input-purchases", icon: "🛒" },
  { name: "Labour Expenses", path: "/labour-expenses", icon: "👷" },
  { name: "Harvests", path: "/harvests", icon: "🌾" },
  { name: "Market Sales", path: "/market-sales", icon: "🏪" },
  { name: "Sale Deductions", path: "/sale-deductions", icon: "➖" },
  { name: "Transport", path: "/transport", icon: "🚚" },
  { name: "Settlements", path: "/settlements", icon: "💰" },
  { name: "Payments", path: "/payments", icon: "💳" },
  { name: "Reports", path: "/reports", icon: "📊" },
];

/* =========================================================
   FARMER NAVIGATION
========================================================= */

const farmerNavigation: NavigationItem[] = [
  { name: "Farmer Dashboard", path: "/farmer-dashboard", icon: "👨‍🌾" },
  { name: "My Fields", path: "/my-fields", icon: "🌱" },
  { name: "My Crop Seasons", path: "/my-crop-seasons", icon: "🌾" },
  { name: "My Harvests", path: "/my-harvests", icon: "🌽" },
  { name: "My Market Sales", path: "/my-market-sales", icon: "🏪" },
  { name: "My Settlements", path: "/my-settlements", icon: "📑" },
  { name: "My Payments", path: "/my-payments", icon: "💳" },
  { name: "My Labour Expenses", path: "/my-labour-expenses", icon: "👷" },
];

/* =========================================================
   AI NAVIGATION
========================================================= */

const aiNavigation: NavigationItem[] = [
  { name: "AgriLedger AI", path: "/ai-dashboard", icon: "🤖" },
  { name: "Anomaly Detection", path: "/anomaly-detection", icon: "🔍" },
  { name: "Yield Prediction", path: "/yield-prediction", icon: "🌾" },
  { name: "Market Price Prediction", path: "/market-price-prediction", icon: "📈" },
  { name: "Market Recommendation", path: "/market-recommendation", icon: "🎯" },
  { name: "Intelligent Reports", path: "/intelligent-reports", icon: "📋" },
  { name: "Weather Advisory", path: "/weather-advisory", icon: "🌦️" },
  { name: "Field Inspections", path: "/field-inspections", icon: "📋" },
  { name: "AI Assistant", path: "/ai-assistant", icon: "💬" },
];

/* =========================================================
   MAIN LAYOUT COMPONENT
========================================================= */

function MainLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isAdmin = user?.role === "ADMIN";
  const mainNavigation = isAdmin ? adminNavigation : farmerNavigation;

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const displayName = isAdmin ? "Administrator" : "Farmer";
  const initials = user?.username?.charAt(0).toUpperCase() || "A";

  // Contextual page title for the topbar
  const getCurrentPageName = () => {
    const allNav = [...adminNavigation, ...farmerNavigation, ...aiNavigation];
    const match = allNav.find((item) => item.path === location.pathname);
    return match ? match.name : "Platform";
  };

  return (
    <div className="al-app-shell">
      {/* Mobile Drawer Overlay */}
      <div
        className={`al-mobile-backdrop ${mobileMenuOpen ? "al-mobile-backdrop--visible" : ""
          }`}
        onClick={closeMobileMenu}
        aria-hidden="true"
      />

      {/* =====================================================
          SIDEBAR NAVIGATION
      ====================================================== */}
      <aside
        className={`al-sidebar ${mobileMenuOpen ? "al-sidebar--open" : ""}`}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div className="al-sidebar__header">
          <div className="al-sidebar__brand-logo" aria-hidden="true">
            🌾
          </div>
          <div className="al-sidebar__brand-text">
            <h1>AgriLedger AI</h1>
            <span>Agricultural SaaS</span>
          </div>
        </div>

        {/* Navigation Sections */}
        <nav className="al-sidebar__nav">
          {/* Main Operational Navigation */}
          <div className="al-sidebar__section">
            <div className="al-sidebar__section-title">
              {isAdmin ? "Management & Finance" : "My Agriculture"}
            </div>

            {mainNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `al-sidebar__nav-link ${isActive ? "active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <span className="al-sidebar__nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>

          {/* AI Decision Support */}
          <div className="al-sidebar__section">
            <div className="al-sidebar__section-title">AI Intelligence Suite</div>

            {aiNavigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `al-sidebar__nav-link ${isActive ? "active" : ""}`
                }
                onClick={closeMobileMenu}
              >
                <span className="al-sidebar__nav-icon" aria-hidden="true">
                  {item.icon}
                </span>
                <span>{item.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Sidebar Footer (User & Logout) */}
        <div className="al-sidebar__footer">
          <div className="al-sidebar__user-profile">
            <div className="al-sidebar__user-avatar">{initials}</div>
            <div className="al-sidebar__user-details">
              <div className="al-sidebar__user-name">{displayName}</div>
              <div className="al-sidebar__user-role">
                @{user?.username || "user"} • {user?.role || "GUEST"}
              </div>
            </div>
          </div>

          <button
            type="button"
            className="al-sidebar__logout-button"
            onClick={handleLogout}
            aria-label="Log out of application"
          >
            <span aria-hidden="true">🚪</span>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* =====================================================
          MAIN CONTENT AREA
      ====================================================== */}
      <div className="al-main-area">
        {/* Top Bar */}
        <header className="al-topbar">
          <div className="al-topbar__left">
            <button
              type="button"
              className="al-topbar__mobile-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label="Toggle navigation drawer"
            >
              ☰
            </button>

            <div className="al-topbar__breadcrumb-area">
              <span className="al-topbar__tagline">
                {isAdmin ? "Enterprise Agriculture Platform" : "Farmer Portal"}
              </span>
              <span className="al-topbar__app-name">{getCurrentPageName()}</span>
            </div>
          </div>

          <div className="al-topbar__right">
            <div className="al-topbar__status-badge">
              <span className="al-topbar__status-dot" aria-hidden="true" />
              <span>Live System</span>
            </div>

            <div className="al-topbar__user-pill">
              <div className="al-topbar__avatar">{initials}</div>
              <div className="al-topbar__user-meta">
                <span className="al-topbar__user-title">{displayName}</span>
                <span className="al-topbar__user-subtitle">
                  {isAdmin ? "Full Access" : "Farmer Account"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Main Routed Page Content */}
        <main className="al-content-container">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;