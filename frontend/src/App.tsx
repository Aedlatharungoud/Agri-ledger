import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { useAuth } from "./context/AuthContext";

import ProtectedRoute from "./components/ProtectedRoute";
import MainLayout from "./layouts/MainLayout";

import Login from "./pages/Login";
import AdminDashboard from "./pages/AdminDashboard";
import FarmerDashboard from "./pages/FarmerDashboard";

import Farmers from "./pages/Farmers";
import Fields from "./pages/Fields";
import CropSeasons from "./pages/CropSeasons";
import Products from "./pages/Products";
import InputPurchases from "./pages/InputPurchases";
import LabourExpenses from "./pages/LabourExpenses";
import MyLabourExpenses from "./pages/MyLabourExpenses";
import MyFields from "./pages/MyFields";
import Harvests from "./pages/Harvests";
import MarketSales from "./pages/MarketSales";
import SaleDeductions from "./pages/SaleDeductions";
import Transport from "./pages/Transport";
import Settlements from "./pages/Settlements";
import FarmerPayments from "./pages/FarmerPayments";
import Reports from "./pages/Reports";

import MyHarvests from "./pages/MyHarvests";
import MyMarketSales from "./pages/MyMarketSales";
import MySettlements from "./pages/MySettlements";
import MyCropSeasons from "./pages/MyCropSeasons";
import MyPayments from "./pages/MyPayments";

import AIDashboard from "./pages/AIDashboard";
import AnomalyDetection from "./pages/AnomalyDetection";
import YieldPrediction from "./pages/YieldPrediction";
import MarketPricePrediction from "./pages/MarketPricePrediction";
import MarketRecommendation from "./pages/MarketRecommendation";
import IntelligentReports from "./pages/IntelligentReports";
import WeatherAdvisory from "./pages/WeatherAdvisory";
import FieldInspections from "./pages/FieldInspections";
import AIAssistantPage from "./pages/AIAssistantPage";


/* =========================================================
   ROOT PAGE
========================================================= */

function RootPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "18px",
          fontWeight: 700,
        }}
      >
        Loading...
      </div>
    );
  }

  if (!user) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  if (String(user.role).toUpperCase() === "ADMIN") {
    return <Navigate to="/admin" replace />;
  }

  return (
    <Navigate
      to="/farmer-dashboard"
      replace
    />
  );
}


/* =========================================================
   APP
========================================================= */

function App() {
  return (
    <BrowserRouter>

      <Routes>

        {/* =====================================================
            PUBLIC LOGIN
        ====================================================== */}

        <Route
          path="/login"
          element={<Login />}
        />


        {/* =====================================================
            AUTHENTICATED APPLICATION
        ====================================================== */}

        <Route
          element={<ProtectedRoute />}
        >

          <Route
            element={<MainLayout />}
          >

            {/* =================================================
                ROOT
            ================================================== */}

            <Route
              path="/"
              element={<RootPage />}
            />


            {/* =================================================
                ADMIN ROUTES
            ================================================== */}

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["ADMIN"]}
                />
              }
            >

              <Route
                path="/admin"
                element={<AdminDashboard />}
              />

              <Route
                path="/farmers"
                element={<Farmers />}
              />

              <Route
                path="/fields"
                element={<Fields />}
              />

              <Route
                path="/crop-seasons"
                element={<CropSeasons />}
              />

              <Route
                path="/products"
                element={<Products />}
              />

              <Route
                path="/input-purchases"
                element={<InputPurchases />}
              />

              <Route
                path="/labour-expenses"
                element={<LabourExpenses />}
              />

              <Route
                path="/harvests"
                element={<Harvests />}
              />

              <Route
                path="/market-sales"
                element={<MarketSales />}
              />

              <Route
                path="/sale-deductions"
                element={<SaleDeductions />}
              />

              <Route
                path="/transport"
                element={<Transport />}
              />

              <Route
                path="/settlements"
                element={<Settlements />}
              />

              <Route
                path="/payments"
                element={<FarmerPayments />}
              />

              <Route
                path="/reports"
                element={<Reports />}
              />

            </Route>


            {/* =================================================
                FARMER ROUTES
            ================================================== */}

            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["FARMER"]}
                />
              }
            >

              <Route
                path="/farmer-dashboard"
                element={<FarmerDashboard />}
              />

              <Route
                path="/my-fields"
                element={<MyFields />}
              />

              <Route
                path="/my-labour-expenses"
                element={<MyLabourExpenses />}
              />

              <Route
                path="/my-harvests"
                element={<MyHarvests />}
              />

              <Route
                path="/my-market-sales"
                element={<MyMarketSales />}
              />

              <Route
                path="/my-settlements"
                element={<MySettlements />}
              />

              <Route
                path="/my-crop-seasons"
                element={<MyCropSeasons />}
              />

              <Route
                path="/my-payments"
                element={<MyPayments />}
              />

            </Route>


            {/* =================================================
                AI ROUTES
            ================================================== */}

            <Route
              path="/ai-dashboard"
              element={<AIDashboard />}
            />

            <Route
              path="/anomaly-detection"
              element={<AnomalyDetection />}
            />

            <Route
              path="/yield-prediction"
              element={<YieldPrediction />}
            />

            <Route
              path="/market-price-prediction"
              element={<MarketPricePrediction />}
            />

            <Route
              path="/market-recommendation"
              element={<MarketRecommendation />}
            />

            <Route
              path="/intelligent-reports"
              element={<IntelligentReports />}
            />

            <Route
              path="/weather-advisory"
              element={<WeatherAdvisory />}
            />

            <Route
              path="/field-inspections"
              element={<FieldInspections />}
            />

            <Route
              path="/crop-doctor"
              element={<Navigate to="/field-inspections" replace />}
            />

            <Route
              path="/ai-assistant"
              element={<AIAssistantPage />}
            />


            {/* =================================================
                FALLBACK
            ================================================== */}

            <Route
              path="*"
              element={
                <Navigate
                  to="/"
                  replace
                />
              }
            />

          </Route>

        </Route>

      </Routes>

    </BrowserRouter>
  );
}


export default App;