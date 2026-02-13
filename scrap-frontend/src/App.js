// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OperadorDashboard from './pages/OperadorDashboard';
import ReceptorDashboard from './pages/ReceptorDashboard';
import ContraloriaDashboard from './pages/ContraloriaDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { injectGlobalStyles } from './styles/animations';
import './App.css';

const HomeRedirect = () => {
  const { user, loading } = useAuth();
  if (loading) {
    return null;
  }

  if (user?.role) {
    return <Navigate to={`/${user.role}`} replace />;
  }

  return <Navigate to="/login" replace />;
};


const App = () => {
  useEffect(() => {
    injectGlobalStyles();
  }, []);

  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<Login />} />

            <Route path="/admin/*" element={
              <ProtectedRoute requiredRole="admin">
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/operador/*" element={
              <ProtectedRoute requiredRole="operador">
                <Layout>
                  <OperadorDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/receptor/*" element={
              <ProtectedRoute requiredRole="receptor">
                <Layout>
                  <ReceptorDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/contraloria/*" element={
              <ProtectedRoute requiredRole="contraloria">
                <Layout>
                  <ContraloriaDashboard />
                </Layout>
              </ProtectedRoute>
            } />



            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
};

export default App;