// src/App.js
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OperadorDashboard from './pages/OperadorDashboard';
import ReceptorDashboard from './pages/ReceptorDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import { ToastProvider } from './context/ToastContext';
import { injectGlobalStyles } from './styles/animations';

// IMPORTAR LOS ESTILOS GLOBALES AQUÍ
import './App.css';

const HomeRedirect = () => {
  const { user } = useAuth();

  if (user?.role === 'admin') {
    return <Navigate to="/admin" replace />;
  } else if (user?.role === 'operador') {
    return <Navigate to="/operador" replace />;
  } else if (user?.role === 'receptor') {
    return <Navigate to="/receptor" replace />;
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
              <ProtectedRoute allowedRoles={['admin']}>
                <Layout>
                  <AdminDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/operador/*" element={
              <ProtectedRoute allowedRoles={['operador']}>
                <Layout>
                  <OperadorDashboard />
                </Layout>
              </ProtectedRoute>
            } />

            <Route path="/receptor/*" element={
              <ProtectedRoute allowedRoles={['receptor']}>
                <Layout>
                  <ReceptorDashboard />
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