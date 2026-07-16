import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { ToastProvider } from "./context/ToastContext";
import LoadingScreen from "./components/LoadingScreen";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const POS = lazy(() => import("./pages/POS"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Forecasting = lazy(() => import("./pages/Forecasting"));
const CustomerAnalytics = lazy(() => import("./pages/CustomerAnalytics"));
const Reports = lazy(() => import("./pages/Reports"));
const Products = lazy(() => import("./pages/Products"));
const Settings = lazy(() => import("./pages/Settings"));

function PrivateRoute({ children, ownerOnly = false }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  // Logged in but lacking permission (e.g. a cashier hitting an owner-only
  // URL directly) - send them to the page they *do* have access to, rather
  // than /login, which would misleadingly read as "you got signed out".
  if (ownerOnly && user.role !== "owner") return <Navigate to="/pos" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Suspense fallback={<LoadingScreen />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/dashboard"
                element={
                  <PrivateRoute ownerOnly>
                    <Dashboard />
                  </PrivateRoute>
                }
              />
              <Route
                path="/pos"
                element={
                  <PrivateRoute>
                    <POS />
                  </PrivateRoute>
                }
              />
              <Route
                path="/assistant"
                element={
                  <PrivateRoute ownerOnly>
                    <Assistant />
                  </PrivateRoute>
                }
              />
              <Route
                path="/forecasting"
                element={
                  <PrivateRoute ownerOnly>
                    <Forecasting />
                  </PrivateRoute>
                }
              />
              <Route
                path="/customers"
                element={
                  <PrivateRoute ownerOnly>
                    <CustomerAnalytics />
                  </PrivateRoute>
                }
              />
              <Route
                path="/reports"
                element={
                  <PrivateRoute ownerOnly>
                    <Reports />
                  </PrivateRoute>
                }
              />
              <Route
                path="/products"
                element={
                  <PrivateRoute ownerOnly>
                    <Products />
                  </PrivateRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <PrivateRoute ownerOnly>
                    <Settings />
                  </PrivateRoute>
                }
              />
              <Route path="/" element={<Navigate to="/pos" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
