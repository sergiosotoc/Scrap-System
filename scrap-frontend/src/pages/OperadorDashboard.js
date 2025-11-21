// src/pages/OperadorDashboard.js - VERSIÓN CORREGIDA
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import RegistroScrapCompleto from '../components/RegistroScrapCompleto'; // Asegúrate de tener este componente actualizado

const OperadorDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [showModal, setShowModal] = useState(false);
  const [registros, setRegistros] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [cargandoRegistros, setCargandoRegistros] = useState(true);
  
  const [filtros, setFiltros] = useState({ area: '', turno: '', fecha: '' });

  const loadOperadorData = useCallback(async () => {
    setCargandoRegistros(true);
    try {
      const [registrosData, statsData] = await Promise.all([
        apiClient.getRegistrosScrap(filtros),
        apiClient.getRegistroScrapStats()
      ]);
      setRegistros(Array.isArray(registrosData) ? registrosData : []);
      setStats(statsData);
    } catch (error) {
      addToast('Error cargando datos: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setCargandoRegistros(false);
    }
  }, [filtros, addToast]);

  useEffect(() => {
    loadOperadorData();
  }, [loadOperadorData]);

  const handleFiltroChange = (e) => {
    setFiltros(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const generarReporteGeneral = async () => {
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const token = localStorage.getItem('authToken');
      const url = `http://localhost:8000/api/registros-scrap/generar-reporte-diario`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ fecha: fecha })
      });

      if (!response.ok) throw new Error(`Error ${response.status}`);

      const blob = await response.blob();
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', `reporte_general_${fecha}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      addToast('Reporte PDF generado exitosamente', 'success');
    } catch (error) {
      addToast('Error generando reporte: ' + error.message, 'error');
    }
  };

  const handleRegistroCreado = () => {
    setShowModal(false);
    addToast('Registro creado correctamente', 'success');
    loadOperadorData();
  };

  if (loading) return <div style={styles.loading}>Cargando...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Dashboard Operador</h1>
          <p style={styles.subtitle}>Hola, {user.name}</p>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          <button onClick={generarReporteGeneral} style={styles.secondaryButton}>📄 Reporte PDF</button>
          <button onClick={() => setShowModal(true)} style={styles.primaryButton}>➕ Nuevo Registro</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div style={styles.gridStats}>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Registros Totales</span>
          <span style={styles.statNumber}>{stats?.total_registros || 0}</span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Peso Total</span>
          <span style={styles.statNumber}>{stats?.total_peso_kg || 0} <small>kg</small></span>
        </div>
        <div style={styles.statCard}>
          <span style={styles.statLabel}>Con Báscula</span>
          <span style={styles.statNumber}>{stats?.registros_bascula || 0}</span>
        </div>
      </div>

      {/* Filtros & Tabla */}
      <div style={styles.card}>
        <div style={styles.cardHeader}>
          <h3>📋 Registros Recientes</h3>
          <div style={styles.filters}>
            <select name="area" onChange={handleFiltroChange} style={styles.smallSelect}>
              <option value="">Todas Áreas</option>
              <option value="TREFILADO">Trefilado</option>
              <option value="EXTRUSION">Extrusión</option>
              {/* ... resto de opciones ... */}
            </select>
            <select name="turno" onChange={handleFiltroChange} style={styles.smallSelect}>
              <option value="">Todos Turnos</option>
              <option value="1">Turno 1</option>
              <option value="2">Turno 2</option>
              <option value="3">Turno 3</option>
            </select>
          </div>
        </div>

        <div style={styles.tableContainer}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={styles.th}>Fecha</th>
                <th style={styles.th}>Turno</th>
                <th style={styles.th}>Área</th>
                <th style={styles.th}>Máquina</th>
                <th style={styles.th}>Peso</th>
                <th style={styles.th}>Método</th>
              </tr>
            </thead>
            <tbody>
              {registros.length > 0 ? registros.map(r => (
                <tr key={r.id} style={styles.tr}>
                  <td style={styles.td}>{new Date(r.fecha_registro).toLocaleDateString()}</td>
                  <td style={styles.td}>{r.turno}</td>
                  <td style={styles.td}>{r.area_real}</td>
                  <td style={styles.td}>{r.maquina_real}</td>
                  <td style={styles.td}><strong>{r.peso_total} kg</strong></td>
                  <td style={styles.td}>
                    {r.conexion_bascula ? 
                      <span style={styles.badgeSuccess}>⚖️ Báscula</span> : 
                      <span style={styles.badgeWarn}>✍️ Manual</span>
                    }
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="6" style={{...styles.td, textAlign: 'center'}}>No hay registros</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal con RegistroScrapCompleto */}
      {showModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
             <div style={styles.modalHeader}>
                <h3>Nuevo Registro de Scrap</h3>
                <button onClick={() => setShowModal(false)} style={styles.closeBtn}>×</button>
             </div>
             <div style={{padding: '0'}}> 
               {/* Importante: El componente hijo maneja su propio padding si es necesario */}
               <RegistroScrapCompleto 
                  onRegistroCreado={handleRegistroCreado} 
                  onCancelar={() => setShowModal(false)} 
               />
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ESTILOS OPERADOR
const styles = {
  container: { 
    padding: '2rem', 
    backgroundColor: '#F3F4F6', 
    minHeight: '100vh' 
  },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: '2rem' 
  },
  title: { 
    fontSize: '1.5rem', 
    fontWeight: '700', 
    color: '#111827', 
    margin: 0 
  },
  subtitle: { 
    color: '#6B7280' 
  },
  loading: { 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    height: '100vh' 
  },
  gridStats: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
    gap: '1.5rem', 
    marginBottom: '2rem' 
  },
  statCard: { 
    backgroundColor: 'white', 
    padding: '1.5rem', 
    borderRadius: '12px', 
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)' 
  },
  statLabel: { 
    fontSize: '0.875rem', 
    color: '#6B7280', 
    fontWeight: '500' 
  },
  statNumber: { 
    fontSize: '2rem', 
    fontWeight: '700', 
    color: '#111827', 
    display: 'block', 
    marginTop: '0.5rem' 
  },
  card: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)', 
    overflow: 'hidden' 
  },
  cardHeader: { 
    padding: '1.5rem', 
    borderBottom: '1px solid #E5E7EB', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  filters: { 
    display: 'flex', 
    gap: '10px' 
  },
  smallSelect: { 
    padding: '0.5rem', 
    borderRadius: '6px', 
    border: '1px solid #D1D5DB' 
  },
  tableContainer: { overflowX: 'auto' },
  table: { 
    width: '100%', 
    borderCollapse: 'collapse' 
  },
  th: { 
    padding: '1rem', 
    textAlign: 'left', 
    fontSize: '0.75rem', 
    fontWeight: '700', 
    color: '#6B7280', 
    textTransform: 'uppercase', 
    backgroundColor: '#F9FAFB' 
  },
  tr: { 
    borderBottom: '1px solid #E5E7EB', 
    ':hover': { 
      backgroundColor: '#F9FAFB' 
    } 
  },
  td: { 
    padding: '1rem', 
    fontSize: '0.875rem', 
    color: '#374151' 
  },
  badgeSuccess: { 
    backgroundColor: '#D1FAE5', 
    color: '#065F46', 
    padding: '4px 8px', 
    borderRadius: '99px', 
    fontSize: '0.75rem', 
    fontWeight: '600' 
  },
  badgeWarn: { 
    backgroundColor: '#FEF3C7', 
    color: '#92400E', 
    padding: '4px 8px', 
    borderRadius: '99px', 
    fontSize: '0.75rem', 
    fontWeight: '600' 
  },
  primaryButton: { 
    backgroundColor: '#2563EB', 
    color: 'white', 
    padding: '0.75rem 1.5rem',
    borderRadius: '8px', 
    border: 'none', 
    fontWeight: '600', 
    cursor: 'pointer' 
  },
  secondaryButton: { 
    backgroundColor: 'white', 
    color: '#374151', 
    padding: '0.75rem 1.5rem', 
    borderRadius: '8px', 
    border: '1px solid #D1D5DB', 
    fontWeight: '600', 
    cursor: 'pointer' 
  },
  modalOverlay: { 
    position: 'fixed', 
    top: 0, 
    left: 0, 
    right: 0, 
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)', 
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center', 
    zIndex: 50 
  },
  modal: { 
    backgroundColor: 'white', 
    borderRadius: '12px', 
    width: '95%', 
    maxWidth: '900px', 
    maxHeight: '95vh', 
    overflowY: 'auto' 
  },
  modalHeader: { 
    padding: '1.5rem',
    borderBottom: '1px solid #E5E7EB', 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center' 
  },
  closeBtn: { 
    background: 'none', 
    border: 'none', 
    fontSize: '1.5rem', 
    cursor: 'pointer' 
  }
};

export default OperadorDashboard;