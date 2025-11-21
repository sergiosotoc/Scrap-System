import React, { useState, useEffect, useCallback, useRef } from 'react';
import { apiClient } from '../services/api';
import BasculaConnection from './BasculaConnection';
import { useToast } from '../context/ToastContext'; // ✅ Hook

const RegistroScrapCompleto = ({ onRegistroCreado, onCancelar }) => {
  const { addToast } = useToast();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(true);
  const [campoBascula, setCampoBascula] = useState('peso_cobre_estanado');
  const [enviando, setEnviando] = useState(false);

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

  const ultimoPesoRef = useRef(null);
  const ultimoCampoRef = useRef(null);

  useEffect(() => { loadConfig(); }, []);

  const loadConfig = async () => {
    try {
      const configData = await apiClient.getRegistrosConfig();
      setConfig(configData);
    } catch (error) {
      addToast('Error cargando configuración: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePesoFromBascula = useCallback((peso, campo = campoBascula) => {
    if (ultimoPesoRef.current === peso && ultimoCampoRef.current === campo) return;
    if (peso !== 0 || (ultimoPesoRef.current !== null && ultimoPesoRef.current !== 0)) {
      setFormData(prev => ({ ...prev, [campo]: peso, conexion_bascula: peso > 0 }));
      addToast(`Peso actualizado: ${peso}kg en ${campo}`, 'info'); // Feedback sutil
    }
    ultimoPesoRef.current = peso;
    ultimoCampoRef.current = campo;
  }, [campoBascula, addToast]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const tienePesos = Object.keys(formData).some(k => k.startsWith('peso_') && parseFloat(formData[k]) > 0);

    if (!tienePesos) return addToast('Ingrese al menos un peso válido', 'warning');
    if (!formData.turno || !formData.area_real || !formData.maquina_real) return addToast('Complete turno, área y máquina', 'warning');

    setEnviando(true);
    try {
      // Sanitizar números
      const datos = { ...formData };
      Object.keys(datos).forEach(k => {
        if (k.startsWith('peso_')) datos[k] = parseFloat(datos[k]) || 0;
      });

      await apiClient.createRegistroScrap(datos);
      // No mostramos toast aquí si el padre (OperadorDashboard) lo maneja, 
      // pero por seguridad:
      if (onRegistroCreado) onRegistroCreado();
    } catch (error) {
      addToast('Error al guardar: ' + error.message, 'error');
      setEnviando(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Cargando config...</div>;

  return (
    <div style={styles.container}>
      <div style={styles.basculaPanel}>
        <BasculaConnection
          onPesoObtenido={handlePesoFromBascula}
          campoDestino={campoBascula}
        />
        <div style={styles.selectorContainer}>
          <label style={styles.label}>Asignar peso a:</label>
          <select
            value={campoBascula}
            onChange={(e) => setCampoBascula(e.target.value)}
            style={styles.select}
          >
            {config?.tipos_scrap && Object.values(config.tipos_scrap).flat().map(t => (
              <option key={t.columna_db} value={t.columna_db}>{t.tipo_nombre}</option>
            ))}
          </select>
        </div>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        {/* Datos Básicos */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Datos Operativos</h4>
          <div style={styles.grid3}>
            <div>
              <label style={styles.label}>Turno</label>
              <select name="turno" value={formData.turno} onChange={handleInputChange} style={styles.select} required>
                <option value="">Seleccionar...</option>
                {config?.turnos.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Área</label>
              <select name="area_real" value={formData.area_real} onChange={handleInputChange} style={styles.select} required>
                <option value="">Seleccionar...</option>
                {config?.areas_maquinas && Object.keys(config.areas_maquinas).map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label style={styles.label}>Máquina</label>
              <select name="maquina_real" value={formData.maquina_real} onChange={handleInputChange} style={styles.select} required>
                <option value="">Seleccionar...</option>
                {formData.area_real && config?.areas_maquinas[formData.area_real]?.map(m => (
                  <option key={m.maquina_nombre} value={m.maquina_nombre}>{m.maquina_nombre}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Grid de Pesos */}
        <div style={styles.section}>
          <h4 style={styles.sectionTitle}>Detalle de Pesos (kg)</h4>
          <div style={styles.gridPesos}>
            {config?.tipos_scrap && Object.entries(config.tipos_scrap).map(([cat, tipos]) => (
              <div key={cat} style={styles.categoriaGrupo}>
                <h5 style={styles.catTitle}>{cat}</h5>
                {tipos.map(t => (
                  <div key={t.columna_db} style={styles.pesoInputGroup}>
                    <label style={styles.pesoLabel}>{t.tipo_nombre}</label>
                    <input
                      type="number"
                      step="0.001"
                      name={t.columna_db}
                      value={formData[t.columna_db]}
                      onChange={handleInputChange}
                      style={formData[t.columna_db] > 0 ? styles.inputActivo : styles.input}
                      placeholder="0.000"
                    />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <div style={styles.resumen}>
            Total: <span style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
              {Object.keys(formData).filter(k => k.startsWith('peso_')).reduce((acc, k) => acc + (parseFloat(formData[k]) || 0), 0).toFixed(3)} kg
            </span>
          </div>
          <div style={styles.actions}>
            <button type="button" onClick={onCancelar} style={styles.btnCancel}>Cancelar</button>
            <button type="submit" disabled={enviando} style={styles.btnSubmit}>
              {enviando ? 'Guardando...' : '💾 Guardar Registro'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

const styles = {
  container: {
    padding: '1rem'
  },
  basculaPanel: {
    marginBottom: '2rem'
  },
  selectorContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    backgroundColor: '#F3F4F6',
    padding: '1rem',
    borderRadius: '8px',
    marginTop: '-1rem'
  },
  section: {
    marginBottom: '2rem',
    border: '1px solid #E5E7EB',
    borderRadius: '8px',
    padding: '1.5rem'
  },
  sectionTitle: {
    marginTop: 0,
    marginBottom: '1rem',
    color: '#111827',
    borderBottom: '2px solid #E5E7EB',
    paddingBottom: '0.5rem'
  },
  grid3: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.25rem'
  },
  select: {
    width: '100%',
    padding: '0.6rem',
    borderRadius: '6px',
    border: '1px solid #D1D5DB'
  },
  gridPesos: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem'
  },
  categoriaGrupo: {
    backgroundColor: '#F9FAFB',
    padding: '1rem',
    borderRadius: '8px'
  },
  catTitle: {
    margin: '0 0 0.5rem 0',
    color: '#6B7280',
    fontSize: '0.75rem',
    textTransform: 'uppercase'
  },
  pesoInputGroup: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '0.5rem'
  },
  pesoLabel: {
    fontSize: '0.85rem',
    flex: 1
  },
  input: {
    width: '100px',
    padding: '0.4rem',
    border: '1px solid #D1D5DB',
    borderRadius: '4px',
    textAlign: 'right'
  },
  inputActivo: {
    width: '100px',
    padding: '0.4rem',
    border: '1px solid #10B981',
    backgroundColor: '#ECFDF5',
    borderRadius: '4px',
    textAlign: 'right',
    fontWeight: 'bold'
  },
  footer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: '2rem',
    paddingTop: '1rem',
    borderTop: '1px solid #E5E7EB'
  },
  actions: {
    display: 'flex',
    gap: '1rem'
  },
  btnCancel: {
    padding: '0.75rem 1.5rem',
    border: '1px solid #D1D5DB',
    backgroundColor: 'white',
    borderRadius: '6px',
    cursor: 'pointer'
  },
  btnSubmit: {
    padding: '0.75rem 1.5rem',
    border: 'none',
    backgroundColor: '#2563EB',
    color: 'white',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '600'
  }
};

export default RegistroScrapCompleto;