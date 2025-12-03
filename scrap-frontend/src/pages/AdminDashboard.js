/* src/pages/AdminDashboard.js - Actualizado para datos reales */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import UserManagement from '../components/UserManagement';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

// --- COMPONENTES DE GRÁFICAS ACTUALIZADOS ---

const BarChart = ({ data, meses }) => {
  const height = 200;
  const width = 600;
  const padding = 30;
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const barWidth = 40;
  const gap = (chartWidth - (data.length * barWidth)) / (data.length + 1);
  
  const maxValue = Math.max(...data.map(d => d.value), ...data.map(d => d.value2));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {/* Grid Lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
        <g key={i}>
          <line 
            x1={padding} 
            y1={height - padding - (tick * chartHeight)} 
            x2={width - padding} 
            y2={height - padding - (tick * chartHeight)} 
            stroke={colors.gray200} 
            strokeWidth="1" 
            strokeDasharray="4 4"
          />
          <text 
            x={padding - 10} 
            y={height - padding - (tick * chartHeight) + 4} 
            textAnchor="end" 
            fontSize="10" 
            fill={colors.gray500}
          >
            {Math.round(tick * maxValue)} kg
          </text>
        </g>
      ))}

      {/* Bars */}
      {data.map((d, i) => {
        const x = padding + gap + (i * (barWidth + gap));
        const barHeight1 = (d.value / maxValue) * chartHeight;
        const barHeight2 = (d.value2 / maxValue) * chartHeight;
        
        return (
          <g key={i}>
            {/* Bar 1 - Producción */}
            <rect
              x={x}
              y={height - padding - barHeight1}
              width={barWidth / 2}
              height={barHeight1}
              fill={colors.primary}
              rx="2"
            />
            {/* Bar 2 - Recepción */}
            <rect
              x={x + (barWidth / 2)}
              y={height - padding - barHeight2}
              width={barWidth / 2}
              height={barHeight2}
              fill={colors.secondary}
              rx="2"
            />
            {/* Label */}
            <text
              x={x + barWidth / 2}
              y={height - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight="500"
              fill={colors.gray600}
            >
              {meses ? meses[i] : d.label}
            </text>
            {/* Value Tooltips */}
            <text
              x={x + barWidth / 4}
              y={height - padding - barHeight1 - 5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill={colors.primary}
            >
              {d.value.toLocaleString()}kg
            </text>
            <text
              x={x + (barWidth * 3/4)}
              y={height - padding - barHeight2 - 5}
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill={colors.secondary}
            >
              {d.value2.toLocaleString()}kg
            </text>
          </g>
        );
      })}
    </svg>
  );
};

const DonutChart = ({ data, total }) => {
  const size = 200;
  const center = size / 2;
  const radius = 80;
  const strokeWidth = 30;
  let currentAngle = 0;

  const circumference = 2 * Math.PI * radius;
  
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const sliceAngle = (d.value / total) * 360;
          const dash = (d.value / total) * circumference;
          const offset = -1 * (currentAngle / 360) * circumference;
          
          currentAngle += sliceAngle;

          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="transparent"
              stroke={d.color || colors.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={offset}
            />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.gray800 }}>
          {total.toLocaleString()} kg
        </div>
        <div style={{ fontSize: '10px', color: colors.gray500, textTransform: 'uppercase' }}>
          Total Material
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [distribucionData, setDistribucionData] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [mesesGrafica, setMesesGrafica] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);

  useEffect(() => {
    loadData();
    // Refrescar datos cada 5 minutos
    const interval = setInterval(() => {
      loadData();
    }, 300000);

    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardStats();
      
      // Procesar datos para gráfica de barras
      if (data.grafica_barras) {
        const { meses, produccion, recepcion } = data.grafica_barras;
        const formattedChartData = meses.map((mes, index) => ({
          label: mes,
          value: produccion[index] || 0,
          value2: recepcion[index] || 0
        }));
        setChartData(formattedChartData);
        setMesesGrafica(meses);
      }
      
      // Procesar distribución de materiales
      if (data.distribucion_materiales) {
        setDistribucionData(data.distribucion_materiales);
      }
      
      // Procesar actividad reciente
      if (data.actividad_reciente) {
        const actividad = [
          ...data.actividad_reciente.registros,
          ...data.actividad_reciente.recepciones
        ].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setActividadReciente(actividad.slice(0, 8));
      }
      
      setStats(data);
    } catch (error) {
      console.error('Error cargando datos del dashboard:', error);
      addToast('Error cargando datos del dashboard: ' + error.message, 'error');
      
      // Datos de ejemplo en caso de error
      const ejemploMeses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN'];
      const ejemploChartData = ejemploMeses.map(mes => ({
        label: mes,
        value: Math.floor(Math.random() * 10000),
        value2: Math.floor(Math.random() * 8000)
      }));
      setChartData(ejemploChartData);
      setMesesGrafica(ejemploMeses);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalDistribucion = () => {
    return distribucionData.reduce((total, item) => total + (item.value || 0), 0);
  };

  const styles = {
    container: {
      padding: spacing.lg,
      backgroundColor: colors.background,
      minHeight: '100vh',
      fontFamily: typography.fontFamily
    },
    header: {
      marginBottom: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md
    },
    title: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      margin: 0,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text'
    },
    loading: {
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      color: colors.gray500,
      flexDirection: 'column',
      gap: spacing.md
    },
    spinner: {
      width: '60px',
      height: '60px',
      border: `3px solid ${colors.primaryLight}`,
      borderTop: `3px solid ${colors.primary}`,
      borderRight: `3px solid ${colors.secondary}`,
      borderBottom: `3px solid ${colors.secondary}`,
      borderRadius: '50%',
      animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite'
    },
    tabs: {
      display: 'flex',
      gap: spacing.xs,
      borderBottom: `2px solid ${colors.gray200}`,
      paddingBottom: '2px'
    },
    tab: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      color: colors.gray600,
      cursor: 'pointer',
      borderRadius: `${radius.md} ${radius.md} 0 0`,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.medium,
      transition: 'all 0.2s ease',
      ':hover': {
        backgroundColor: colors.gray100,
        color: colors.gray700
      }
    },
    tabActive: {
      padding: `${spacing.sm} ${spacing.md}`,
      background: 'none',
      border: 'none',
      color: colors.primary,
      cursor: 'pointer',
      borderRadius: `${radius.md} ${radius.md} 0 0`,
      fontSize: typography.sizes.base,
      fontWeight: typography.weights.semibold,
      borderBottom: `2px solid ${colors.primary}`,
      marginBottom: '-2px'
    },
    chartsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
      gap: spacing.lg,
      marginBottom: spacing.lg
    },
    chartCard: {
      ...baseComponents.card,
      padding: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.md,
      minHeight: '350px'
    },
    chartHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing.sm
    },
    chartTitle: {
      fontSize: typography.sizes.lg,
      fontWeight: typography.weights.bold,
      color: colors.gray800
    },
    legend: {
      display: 'flex',
      gap: spacing.md,
      fontSize: typography.sizes.xs
    },
    legendItem: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      color: colors.gray600
    },
    dot: (color) => ({
      width: '8px',
      height: '8px',
      borderRadius: '50%',
      backgroundColor: color
    }),
    pieContainer: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-around',
      height: '100%'
    },
    pieLegend: {
      display: 'flex',
      flexDirection: 'column',
      gap: spacing.sm
    },
    card: {
      ...baseComponents.card,
      minHeight: '400px'
    },
    cardHeader: {
      padding: spacing.lg,
      borderBottom: `1px solid ${colors.gray200}`,
      backgroundColor: colors.gray50
    },
    cardTitle: {
      fontSize: typography.sizes.xl,
      fontWeight: typography.weights.semibold,
      color: colors.gray800,
      margin: 0
    },
    actividadContainer: {
      padding: spacing.lg
    },
    actividadItem: {
      padding: spacing.md,
      borderBottom: `1px solid ${colors.gray200}`,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      ':last-child': {
        borderBottom: 'none'
      },
      ':hover': {
        backgroundColor: colors.gray50
      }
    },
    actividadIcono: {
      fontSize: '20px'
    },
    actividadInfo: {
      flex: 1
    },
    actividadDesc: {
      fontSize: typography.sizes.sm,
      fontWeight: typography.weights.medium,
      color: colors.gray800,
      marginBottom: '2px'
    },
    actividadDetalle: {
      fontSize: typography.sizes.xs,
      color: colors.gray600,
      display: 'flex',
      gap: spacing.sm
    },
    actividadFecha: {
      fontSize: typography.sizes.xs,
      color: colors.gray500,
      whiteSpace: 'nowrap'
    },
    refreshButton: {
      ...baseComponents.buttonSecondary,
      marginLeft: 'auto',
      display: 'flex',
      alignItems: 'center',
      gap: spacing.xs,
      padding: `${spacing.xs} ${spacing.sm}`,
      fontSize: typography.sizes.xs
    }
  };

  if (loading && !stats) return (
    <div style={styles.loading}>
      <div style={styles.spinner}></div>
      <div style={{marginTop: spacing.sm, fontSize: typography.sizes.lg}}>
        Cargando datos del dashboard...
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={styles.title}>Panel de Control Administrativo</h1>
          <button 
            onClick={loadData}
            style={styles.refreshButton}
            disabled={loading}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 4v6h-6"></path>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
            </svg>
            {loading ? 'Actualizando...' : 'Actualizar Datos'}
          </button>
        </div>
        <div style={styles.tabs}>
          <button 
            onClick={() => setActiveTab('overview')} 
            style={activeTab === 'overview' ? styles.tabActive : styles.tab}
          >
            Métricas y Gráficas
          </button>
          <button 
            onClick={() => setActiveTab('users')} 
            style={activeTab === 'users' ? styles.tabActive : styles.tab}
          >
            Gestión de Usuarios
          </button>
        </div>
      </div>

      {activeTab === 'overview' && (
        <>
          <div style={styles.chartsGrid}>
            {/* GRÁFICA DE BARRAS: Tendencia */}
            <div style={styles.chartCard}>
                <div style={styles.chartHeader}>
                    <div style={styles.chartTitle}>Producción vs Recepción (kg)</div>
                    <div style={styles.legend}>
                        <div style={styles.legendItem}>
                            <div style={styles.dot(colors.primary)}></div>
                            <span>Producción</span>
                        </div>
                        <div style={styles.legendItem}>
                            <div style={styles.dot(colors.secondary)}></div>
                            <span>Recepción</span>
                        </div>
                    </div>
                </div>
                <div style={{flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
                    {chartData.length > 0 ? (
                      <BarChart data={chartData} meses={mesesGrafica} />
                    ) : (
                      <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>
                        No hay datos disponibles para la gráfica
                      </div>
                    )}
                </div>
            </div>

            {/* GRÁFICA CIRCULAR: Distribución */}
            <div style={styles.chartCard}>
                <div style={styles.chartHeader}>
                    <div style={styles.chartTitle}>Distribución de Materiales</div>
                </div>
                <div style={styles.pieContainer}>
                    {distribucionData.length > 0 ? (
                      <>
                        <DonutChart 
                          data={distribucionData} 
                          total={calcularTotalDistribucion()} 
                        />
                        <div style={styles.pieLegend}>
                            {distribucionData.map((d, i) => (
                                <div key={i} style={styles.legendItem}>
                                    <div style={styles.dot(d.color)}></div>
                                    <span style={{fontWeight: '500', minWidth: '100px'}}>
                                      {d.name}
                                    </span>
                                    <span style={{fontWeight: 'bold', color: colors.gray800}}>
                                      {d.value ? `${d.value.toLocaleString()} kg` : '0 kg'}
                                    </span>
                                </div>
                            ))}
                        </div>
                      </>
                    ) : (
                      <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>
                        No hay datos de materiales disponibles
                      </div>
                    )}
                </div>
            </div>
          </div>

          <div style={styles.chartsGrid}>
            {/* RESUMEN EJECUTIVO */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Resumen Ejecutivo de Operaciones</h3>
              </div>
              <div style={{ padding: spacing.xl, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.xl }}>
                  <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}>
                      <div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Usuarios</div>
                      <div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.primary}}>
                        {stats?.total_usuarios || 0}
                      </div>
                  </div>
                  <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}>
                      <div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Registros</div>
                      <div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.secondary}}>
                        {stats?.total_registros || 0}
                      </div>
                  </div>
                  <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}>
                      <div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Procesado</div>
                      <div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.gray800}}>
                          {(stats?.total_peso_kg || 0).toLocaleString()} 
                          <span style={{fontSize: '1rem', color: colors.gray400}}> kg</span>
                      </div>
                  </div>
                  <div style={{textAlign: 'center'}}>
                      <div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Eficiencia Global</div>
                      <div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.warning}}>
                          {(stats?.eficiencia_global || 0).toFixed(1)}%
                      </div>
                  </div>
              </div>
            </div>

            {/* ACTIVIDAD RECIENTE */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>Actividad Reciente</h3>
              </div>
              <div style={styles.actividadContainer}>
                {actividadReciente.length > 0 ? (
                  actividadReciente.map((actividad, index) => (
                    <div key={index} style={styles.actividadItem}>
                      <div style={styles.actividadIcono}>
                        {actividad.tipo === 'registro' ? '📦' : '📥'}
                      </div>
                      <div style={styles.actividadInfo}>
                        <div style={styles.actividadDesc}>
                          {actividad.tipo === 'registro' 
                            ? `Registro en ${actividad.area}`
                            : `Recepción de ${actividad.material}`
                          }
                        </div>
                        <div style={styles.actividadDetalle}>
                          <span>👤 {actividad.operador || actividad.receptor}</span>
                          <span>⚖️ {actividad.peso} kg</span>
                        </div>
                      </div>
                      <div style={styles.actividadFecha}>
                        {actividad.fecha}
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>
                    No hay actividad reciente
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === 'users' && (
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <h3 style={styles.cardTitle}>Gestión de Usuarios del Sistema</h3>
          </div>
          <div style={{ padding: spacing.lg }}>
            <UserManagement />
          </div>
        </div>
      )}
    </div>
  );
};

// Inyección de estilos de animación global
const styleSheet = document.styleSheets[0];
if (styleSheet) {
  try {
    styleSheet.insertRule(`
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `, styleSheet.cssRules.length);
  } catch (e) {}
}

export default AdminDashboard;