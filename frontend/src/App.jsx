import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Wydatki from "./pages/Wydatki";
import Splaty from "./pages/Splaty";
import Rozliczenia from "./pages/Rozliczenia";
import Inflacja from "./pages/Inflacja";

function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  if (!isLoggedIn) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { isLoggedIn } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={isLoggedIn ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/wydatki" element={<RequireAuth><Wydatki /></RequireAuth>} />
      <Route path="/splaty" element={<RequireAuth><Splaty /></RequireAuth>} />
      <Route path="/rozliczenia" element={<RequireAuth><Rozliczenia /></RequireAuth>} />
      <Route path="/inflacja" element={<RequireAuth><Inflacja /></RequireAuth>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
