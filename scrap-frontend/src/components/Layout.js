/* src/components/routes/Layout.js */

import React from 'react';
import { useAuth } from '../context/AuthContext';

const Layout = ({ children }) => {
  const { user, logout } = useAuth();

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1>Sistema de Control de Scrap</h1>
        <div style={styles.userInfo}>
          <span>{user.name} ({user.role})</span>
          <button onClick={logout} style={styles.logoutButton}>
            Cerrar Sesión
          </button>
        </div>
      </header>
      <main style={styles.main}>
        {children}
      </main>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8f9fa',
  },
  header: {
    backgroundColor: 'white',
    padding: '1rem 2rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  logoutButton: {
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  main: {
    padding: '2rem',
  },
};

export default Layout;