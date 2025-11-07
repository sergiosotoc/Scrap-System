// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import OperadorDashboard from './pages/OperadorDashboard';
import ReceptorDashboard from './pages/ReceptorDashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const HomeRedirect = () => {
  const { user } = useAuth();

  console.log('HomeRedirect - Usuario:', user);

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
  return (
    <Router>
      <AuthProvider>
        <Routes>
          {/* Ruta raíz - redirección automática */}
          <Route path="/" element={<HomeRedirect />} />

          {/* Ruta de login */}
          <Route path="/login" element={<Login />} />

          {/* Dashboard de administrador */}
          <Route path="/admin/*" element={
            <ProtectedRoute allowedRoles={['admin']}>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Dashboard de operador */}
          <Route path="/operador/*" element={
            <ProtectedRoute allowedRoles={['operador']}>
              <Layout>
                <OperadorDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Dashboard de receptor - CORREGIDO */}
          <Route path="/receptor/*" element={
            <ProtectedRoute allowedRoles={['receptor']}>
              <Layout>
                <ReceptorDashboard />
              </Layout>
            </ProtectedRoute>
          } />

          {/* Redirección para rutas no encontradas */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </Router>
  );
};

export default App;