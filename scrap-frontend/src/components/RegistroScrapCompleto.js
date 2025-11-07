// src/components/RegistroScrapCompleto.js - MEJORADO
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';

const RegistroScrapCompleto = () => {
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campoBascula, setCampoBascula] = useState('peso_cobre_estanado');
  const [formData, setFormData] = useState({
    turno: '',
    area_real: '',
    maquina_real: '',
    peso_cobre_estanado: '',
    peso_purga_pvc: '',
    peso_purga_pe: '',
    peso_purga_pur: '',
    peso_purga_pp: '',
    peso_cable_pvc: '',
    peso_cable_pe: '',
    peso_cable_pur: '',
    peso_cable_pp: '',
    peso_cable_aluminio: '',
    peso_cable_estanado_pvc: '',
    peso_cable_estanado_pe: '',
    conexion_bascula: false,
    numero_lote: '',
    observaciones: ''
  });

  const [showReporteOptions, setShowReporteOptions] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const configData = await apiClient.getRegistrosConfig();
      setConfig(configData);
    } catch (error) {
      alert('Error cargando configuración: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePesoFromBascula = (peso, campo = campoBascula) => {
    setFormData(prev => ({
      ...prev,
      [campo]: peso,
      conexion_bascula: true
    }));
  };

  const calcularTotal = () => {
    const total = Object.keys(formData)
      .filter(key => key.startsWith('peso_'))
      .reduce((sum, key) => sum + (parseFloat(formData[key]) || 0), 0);
    
    return total.toFixed(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validar que al menos un campo de peso tenga valor
    const tienePesos = Object.keys(formData).some(key => 
      key.startsWith('peso_') && parseFloat(formData[key]) > 0
    );

    if (!tienePesos) {
      alert('Debe ingresar al menos un peso para algún tipo de scrap.');
      return;
    }

    try {
      // Convertir campos vacíos a 0
      const datosEnviar = { ...formData };
      Object.keys(datosEnviar).forEach(key => {
        if (key.startsWith('peso_') && datosEnviar[key] === '') {
          datosEnviar[key] = 0;
        }
      });

      const resultado = await apiClient.createRegistroScrap(datosEnviar);

      alert('✅ Registro de scrap guardado exitosamente!');
      
      // Mostrar opciones de reporte
      setShowReporteOptions(true);
      
    } catch (error) {
      alert('❌ Error: ' + error.message);
    }
  };

  const generarReporteDiario = async () => {
    try {
      const fecha = new Date().toISOString().split('T')[0];
      const turno = formData.turno;
      
      // Crear un enlace temporal para descargar el PDF
      const token = localStorage.getItem('authToken');
      const url = `http://localhost:8000/api/registros-scrap/generar-reporte-diario`;
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fecha: fecha,
          turno: turno
        })
      });

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      // Obtener el blob del PDF
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `reporte_diario_${fecha}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);

      alert('📄 Reporte PDF generado y descargado exitosamente!');
      setShowReporteOptions(false);

    } catch (error) {
      alert('❌ Error generando reporte: ' + error.message);
    }
  };

  const limpiarFormulario = () => {
    setFormData({
      turno: '',
      area_real: '',
      maquina_real: '',
      peso_cobre_estanado: '',
      peso_purga_pvc: '',
      peso_purga_pe: '',
      peso_purga_pur: '',
      peso_purga_pp: '',
      peso_cable_pvc: '',
      peso_cable_pe: '',
      peso_cable_pur: '',
      peso_cable_pp: '',
      peso_cable_aluminio: '',
      peso_cable_estanado_pvc: '',
      peso_cable_estanado_pe: '',
      conexion_bascula: false,
      numero_lote: '',
      observaciones: ''
    });
    setShowReporteOptions(false);
  };

  const continuarSinReporte = () => {
    setShowReporteOptions(false);
    limpiarFormulario();
  };

  if (loading) return <div style={styles.loading}>📋 Cargando configuración...</div>;

  return (
    <div style={styles.container}>
      <h2>📝 Registro de Scrap - Formato Completo</h2>
      
      {/* Sección de Báscula */}
      <div style={styles.basculaSection}>
        <BasculaConnection 
          onPesoObtenido={handlePesoFromBascula}
          campoDestino={campoBascula}
        />
        
        <div style={styles.campoSelector}>
          <label style={styles.selectorLabel}>Asignar peso a:</label>
          <select
            value={campoBascula}
            onChange={(e) => setCampoBascula(e.target.value)}
            style={styles.selector}
          >
            {config.tipos_scrap && Object.values(config.tipos_scrap).flat().map(tipo => (
              <option key={tipo.columna_db} value={tipo.columna_db}>
                {tipo.tipo_nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Información Básica */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📋 Información Básica</h3>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.label}>🕒 Turno:</label>
              <select
                name="turno"
                value={formData.turno}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">Seleccionar turno</option>
                {config.turnos.map(turno => (
                  <option key={turno} value={turno}>Turno {turno}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>🏭 Área:</label>
              <select
                name="area_real"
                value={formData.area_real}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">Seleccionar área</option>
                {Object.keys(config.areas_maquinas).map(area => (
                  <option key={area} value={area}>{area}</option>
                ))}
              </select>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>⚙️ Máquina:</label>
              <select
                name="maquina_real"
                value={formData.maquina_real}
                onChange={handleInputChange}
                style={styles.select}
                required
              >
                <option value="">Seleccionar máquina</option>
                {formData.area_real && config.areas_maquinas[formData.area_real]?.map(maquina => (
                  <option key={maquina.maquina_nombre} value={maquina.maquina_nombre}>
                    {maquina.maquina_nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Pesos por Tipo de Scrap */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>⚖️ Pesos por Tipo de Scrap (kg)</h3>
          
          {Object.keys(config.tipos_scrap).map(categoria => (
            <div key={categoria} style={styles.categoria}>
              <h4 style={styles.categoriaTitle}>{categoria}</h4>
              <div style={styles.tiposGrid}>
                {config.tipos_scrap[categoria].map(tipo => (
                  <div key={tipo.columna_db} style={styles.tipoInput}>
                    <label style={styles.tipoLabel}>{tipo.tipo_nombre}:</label>
                    <input
                      type="number"
                      name={tipo.columna_db}
                      value={formData[tipo.columna_db]}
                      onChange={handleInputChange}
                      style={styles.numberInput}
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Información Adicional */}
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>📄 Información Adicional</h3>
          <div style={styles.formRow}>
            <div style={styles.formGroup}>
              <label style={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  name="conexion_bascula"
                  checked={formData.conexion_bascula}
                  onChange={handleInputChange}
                  style={styles.checkbox}
                />
                ✅ Registrado con báscula
              </label>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>🏷️ Número de Lote:</label>
              <input
                type="text"
                name="numero_lote"
                value={formData.numero_lote}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Opcional"
              />
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>📝 Observaciones:</label>
              <input
                type="text"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleInputChange}
                style={styles.input}
                placeholder="Observaciones adicionales"
              />
            </div>
          </div>
        </div>

        {/* Resumen y Envío */}
        <div style={styles.resumenSection}>
          <div style={styles.totalDisplay}>
            <span style={styles.totalLabel}>PESO TOTAL:</span>
            <span style={styles.totalValue}>{calcularTotal()} kg</span>
          </div>

          <button type="submit" style={styles.submitButton}>
            💾 Guardar Registro Completo
          </button>
        </div>
      </form>

      {/* Modal de opciones de reporte */}
      {showReporteOptions && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>📄 Generar Reporte PDF</h3>
            <p>¿Deseas generar un reporte PDF con el registro realizado?</p>
            
            <div style={styles.modalActions}>
              <button 
                onClick={generarReporteDiario}
                style={styles.reporteButton}
              >
                📥 Descargar Reporte PDF
              </button>
              <button 
                onClick={continuarSinReporte}
                style={styles.continuarButton}
              >
                ➕ Continuar sin Reporte
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
  },
  loading: {
    textAlign: 'center',
    padding: '2rem',
    fontSize: '1.2rem',
  },
  basculaSection: {
    marginBottom: '2rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '8px',
  },
  campoSelector: {
    marginTop: '1rem',
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
  },
  selectorLabel: {
    fontWeight: 'bold',
    color: '#333',
  },
  selector: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
  },
  form: {
    marginTop: '1rem',
  },
  section: {
    marginBottom: '2rem',
    padding: '1.5rem',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
  },
  sectionTitle: {
    margin: '0 0 1rem 0',
    color: '#333',
    borderBottom: '2px solid #007bff',
    paddingBottom: '0.5rem',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
    gap: '1rem',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
  },
  label: {
    marginBottom: '0.5rem',
    fontWeight: 'bold',
    color: '#333',
  },
  select: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  input: {
    padding: '0.75rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
  },
  numberInput: {
    padding: '0.5rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    width: '120px',
    textAlign: 'right',
  },
  categoria: {
    marginBottom: '1.5rem',
    padding: '1rem',
    backgroundColor: '#f8f9fa',
    borderRadius: '4px',
  },
  categoriaTitle: {
    margin: '0 0 1rem 0',
    color: '#495057',
    fontSize: '1.1rem',
  },
  tiposGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '1rem',
  },
  tipoInput: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0.5rem',
    backgroundColor: 'white',
    borderRadius: '4px',
  },
  tipoLabel: {
    fontSize: '0.9rem',
    color: '#555',
    flex: 1,
  },
  checkboxLabel: {
    display: 'flex',
    alignItems: 'center',
    cursor: 'pointer',
    marginTop: '1.5rem',
  },
  checkbox: {
    marginRight: '0.5rem',
  },
  resumenSection: {
    marginTop: '2rem',
    padding: '1.5rem',
    backgroundColor: '#e8f5e8',
    borderRadius: '8px',
    textAlign: 'center',
  },
  totalDisplay: {
    marginBottom: '1rem',
  },
  totalLabel: {
    fontSize: '1.2rem',
    fontWeight: 'bold',
    color: '#2d5016',
    marginRight: '1rem',
  },
  totalValue: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#28a745',
  },
  submitButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '1rem 2rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1.1rem',
    width: '100%',
    fontWeight: 'bold',
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
    zIndex: 1000,
  },
  modal: {
    backgroundColor: 'white',
    padding: '2rem',
    borderRadius: '8px',
    textAlign: 'center',
    maxWidth: '500px',
    width: '90%',
  },
  modalActions: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
    marginTop: '1.5rem',
  },
  reporteButton: {
    backgroundColor: '#007bff',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: 'bold',
  },
  continuarButton: {
    backgroundColor: '#6c757d',
    color: 'white',
    border: 'none',
    padding: '1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '1rem',
  },
};

export default RegistroScrapCompleto;