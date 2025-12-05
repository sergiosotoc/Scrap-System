/* src/pages/AdminDashboard.js */
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import UserManagement from '../components/UserManagement';
import { colors, spacing, typography, baseComponents } from '../styles/designSystem';

// Componentes Smooth Importados
import PageWrapper from '../components/PageWrapper';
import LoadingSpinner from '../components/LoadingSpinner';
import CardTransition from '../components/CardTransition';
import SmoothButton from '../components/SmoothButton';
import TabsAnimated from '../components/TabsAnimated';

// --- UTILIDAD: CONTADOR ANIMADO ---
const AnimatedCounter = ({ value, duration = 1500 }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = 0;
    if (value === 0) { setCount(0); return; }
    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      setCount(Math.floor(easeOut * (value - startValue) + startValue));
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{count.toLocaleString()}</span>;
};

// --- GRÁFICAS ---
const BarChart = ({ data, meses, animate }) => {
  const height = 200; const width = 600; const padding = 30;
  const chartHeight = height - padding * 2; const chartWidth = width - padding * 2;
  const barWidth = 40; const gap = (chartWidth - (data.length * barWidth)) / (data.length + 1);
  const maxValue = Math.max(...data.map(d => d.value), ...data.map(d => d.value2)) || 1;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
      {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
        <g key={i} style={{ opacity: animate ? 1 : 0, transition: `opacity 0.5s ease ${i * 0.1}s` }}>
          <line x1={padding} y1={height - padding - (tick * chartHeight)} x2={width - padding} y2={height - padding - (tick * chartHeight)} stroke={colors.gray200} strokeWidth="1" strokeDasharray="4 4" />
          <text x={padding - 10} y={height - padding - (tick * chartHeight) + 4} textAnchor="end" fontSize="10" fill={colors.gray500}>{Math.round(tick * maxValue)} kg</text>
        </g>
      ))}
      {data.map((d, i) => {
        const x = padding + gap + (i * (barWidth + gap));
        const barHeight1 = (d.value / maxValue) * chartHeight;
        const barHeight2 = (d.value2 / maxValue) * chartHeight;
        return (
          <g key={i}>
            <rect x={x} y={animate ? height - padding - barHeight1 : height - padding} width={barWidth / 2} height={animate ? barHeight1 : 0} fill={colors.primary} rx="2" style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${i * 0.1}s` }} />
            <rect x={x + (barWidth / 2)} y={animate ? height - padding - barHeight2 : height - padding} width={barWidth / 2} height={animate ? barHeight2 : 0} fill={colors.secondary} rx="2" style={{ transition: 'all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1)', transitionDelay: `${(i * 0.1) + 0.05}s` }} />
            <text x={x + barWidth / 2} y={height - 10} textAnchor="middle" fontSize="11" fontWeight="500" fill={colors.gray600} style={{ opacity: animate ? 1 : 0, transition: `opacity 0.5s ease ${0.5 + (i * 0.1)}s` }}>{meses ? meses[i] : d.label}</text>
          </g>
        );
      })}
    </svg>
  );
};

const DonutChart = ({ data, total, animate }) => {
  const size = 200; const center = size / 2; const radius = 80; const strokeWidth = 30;
  let currentAngle = 0; const circumference = 2 * Math.PI * radius;
  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const sliceAngle = (d.value / total) * 360;
          const dash = (d.value / total) * circumference;
          const offset = -1 * (currentAngle / 360) * circumference;
          currentAngle += sliceAngle;
          return (
            <circle key={i} cx={center} cy={center} r={radius} fill="transparent" stroke={d.color || colors.primary} strokeWidth={strokeWidth} strokeDasharray={`${dash} ${circumference}`} strokeDashoffset={animate ? offset : circumference} style={{ transition: 'stroke-dashoffset 1.5s ease-out', transitionDelay: `${i * 0.2}s` }} />
          );
        })}
      </svg>
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: `translate(-50%, -50%) scale(${animate ? 1 : 0.8})`, opacity: animate ? 1 : 0, textAlign: 'center', transition: 'all 0.5s ease 1s' }}>
        <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.gray800 }}><AnimatedCounter value={total} /> kg</div>
        <div style={{ fontSize: '10px', color: colors.gray500, textTransform: 'uppercase' }}>Total</div>
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
  const [loading, setLoading] = useState(true);
  const [mesesGrafica, setMesesGrafica] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  useEffect(() => {
    loadData();
    const interval = setInterval(() => { loadData(); }, 300000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // setLoading(true); // Opcional: Desactivar loading visual en actualizaciones automáticas
      const data = await apiClient.getDashboardStats();
      if (data.grafica_barras) {
        const { meses, produccion, recepcion } = data.grafica_barras;
        setChartData(meses.map((mes, index) => ({ label: mes, value: produccion[index] || 0, value2: recepcion[index] || 0 })));
        setMesesGrafica(meses);
      }
      if (data.distribucion_materiales) setDistribucionData(data.distribucion_materiales);
      if (data.actividad_reciente) {
        const actividad = [...data.actividad_reciente.registros, ...data.actividad_reciente.recepciones].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setActividadReciente(actividad.slice(0, 8));
      }
      setStats(data);
      setTimeout(() => setTriggerAnimation(true), 100);
    } catch (error) {
      console.error('Error cargando datos:', error);
      if (loading) addToast('Error cargando datos: ' + error.message, 'error');
      
      const ejemploMeses = ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN'];
      setChartData(ejemploMeses.map(mes => ({ label: mes, value: Math.floor(Math.random() * 10000), value2: Math.floor(Math.random() * 8000) })));
      setMesesGrafica(ejemploMeses);
      setTimeout(() => setTriggerAnimation(true), 100);
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalDistribucion = () => distribucionData.reduce((total, item) => total + (item.value || 0), 0);

  const styles = {
    // CORRECCIÓN: Layout ajustado para evitar scroll global innecesario
    container: { 
      // padding: spacing.lg, // Quitamos padding para que lo maneje el Layout o el wrapper interno si se desea
      backgroundColor: colors.background, 
      fontFamily: typography.fontFamily,
      boxSizing: 'border-box',
      width: '100%',
      height: 'auto' 
    },
    header: { marginBottom: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.md },
    title: { fontSize: typography.sizes['3xl'], fontWeight: typography.weights.extrabold, color: colors.gray900, margin: 0, background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' },
    // CORRECCIÓN: Altura de carga ajustada
    loading: { 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%', 
      minHeight: '50vh',
      color: colors.gray500, 
      flexDirection: 'column', 
      gap: spacing.md 
    },
    chartsGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: spacing.lg, marginBottom: spacing.lg },
    chartCard: { ...baseComponents.card, padding: spacing.lg, display: 'flex', flexDirection: 'column', gap: spacing.md, minHeight: '350px', transition: 'transform 0.2s ease, box-shadow 0.2s ease' },
    chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm },
    chartTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.gray800 },
    legend: { display: 'flex', gap: spacing.md, fontSize: typography.sizes.xs },
    legendItem: { display: 'flex', alignItems: 'center', gap: '4px', color: colors.gray600 },
    dot: (color) => ({ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: color }),
    pieContainer: { display: 'flex', alignItems: 'center', justifyContent: 'space-around', height: '100%' },
    pieLegend: { display: 'flex', flexDirection: 'column', gap: spacing.sm },
    card: { ...baseComponents.card, minHeight: '400px' },
    cardHeader: { padding: spacing.lg, borderBottom: `1px solid ${colors.gray200}`, backgroundColor: colors.gray50 },
    cardTitle: { fontSize: typography.sizes.xl, fontWeight: typography.weights.semibold, color: colors.gray800, margin: 0 },
    actividadContainer: { padding: spacing.lg },
    actividadItem: { padding: spacing.md, borderBottom: `1px solid ${colors.gray200}`, display: 'flex', alignItems: 'center', gap: spacing.md, cursor: 'default', transition: 'background-color 0.2s ease' },
    actividadIcono: { fontSize: '20px' },
    actividadInfo: { flex: 1 },
    actividadDesc: { fontSize: typography.sizes.sm, fontWeight: typography.weights.medium, color: colors.gray800, marginBottom: '2px' },
    actividadDetalle: { fontSize: typography.sizes.xs, color: colors.gray600, display: 'flex', gap: spacing.sm },
    actividadFecha: { fontSize: typography.sizes.xs, color: colors.gray500, whiteSpace: 'nowrap' },
  };

  if (loading && !stats) return <div style={styles.loading}><LoadingSpinner message="Cargando datos del dashboard..." /></div>;

  const OverviewContent = () => (
    <div>
      <div style={styles.chartsGrid}>
        <CardTransition delay={100} style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div style={styles.chartTitle}>Producción vs Recepción (kg)</div>
            <div style={styles.legend}>
              <div style={styles.legendItem}><div style={styles.dot(colors.primary)}></div><span>Producción</span></div>
              <div style={styles.legendItem}><div style={styles.dot(colors.secondary)}></div><span>Recepción</span></div>
            </div>
          </div>
          <div style={{flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center'}}>
            {chartData.length > 0 ? <BarChart data={chartData} meses={mesesGrafica} animate={triggerAnimation} /> : <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>No hay datos disponibles</div>}
          </div>
        </CardTransition>

        <CardTransition delay={200} style={styles.chartCard}>
          <div style={styles.chartHeader}><div style={styles.chartTitle}>Distribución de Materiales</div></div>
          <div style={styles.pieContainer}>
            {distribucionData.length > 0 ? (
              <>
                <DonutChart data={distribucionData} total={calcularTotalDistribucion()} animate={triggerAnimation} />
                <div style={styles.pieLegend}>
                  {distribucionData.map((d, i) => (
                    <div key={i} style={{ ...styles.legendItem, opacity: triggerAnimation ? 1 : 0, transform: triggerAnimation ? 'translateX(0)' : 'translateX(20px)', transition: `all 0.5s ease ${0.5 + (i * 0.1)}s` }}>
                      <div style={styles.dot(d.color)}></div>
                      <span style={{fontWeight: '500', minWidth: '100px'}}>{d.name}</span>
                      <span style={{fontWeight: 'bold', color: colors.gray800}}>{d.value ? <AnimatedCounter value={d.value} duration={1000} /> : '0'} kg</span>
                    </div>
                  ))}
                </div>
              </>
            ) : <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>No hay datos de materiales disponibles</div>}
          </div>
        </CardTransition>
      </div>

      <div style={styles.chartsGrid}>
        <CardTransition delay={300} style={styles.card}>
          <div style={styles.cardHeader}><h3 style={styles.cardTitle}>Resumen Ejecutivo de Operaciones</h3></div>
          <div style={{ padding: spacing.xl, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: spacing.xl }}>
            <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}><div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Usuarios</div><div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.primary}}><AnimatedCounter value={stats?.total_usuarios || 0} /></div></div>
            <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}><div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Registros</div><div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.secondary}}><AnimatedCounter value={stats?.total_registros || 0} /></div></div>
            <div style={{textAlign: 'center', borderRight: `1px solid ${colors.gray200}`}}><div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Total Procesado</div><div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.gray800}}><AnimatedCounter value={stats?.total_peso_kg || 0} /> <span style={{fontSize: '1rem', color: colors.gray400}}> kg</span></div></div>
            <div style={{textAlign: 'center'}}><div style={{fontSize: typography.sizes.sm, color: colors.gray500, textTransform: 'uppercase', letterSpacing: '1px'}}>Eficiencia Global</div><div style={{fontSize: '2.5rem', fontWeight: '800', color: colors.warning}}><AnimatedCounter value={stats?.eficiencia_global || 0} />%</div></div>
          </div>
        </CardTransition>

        <CardTransition delay={400} style={styles.card}>
          <div style={styles.cardHeader}><h3 style={styles.cardTitle}>Actividad Reciente</h3></div>
          <div style={styles.actividadContainer}>
            {actividadReciente.length > 0 ? (
              actividadReciente.map((actividad, index) => (
                <div key={index} style={{ ...styles.actividadItem }} onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.gray50} onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}>
                  <div style={styles.actividadIcono}>{actividad.tipo === 'registro' ? '📦' : '📥'}</div>
                  <div style={styles.actividadInfo}><div style={styles.actividadDesc}>{actividad.tipo === 'registro' ? `Registro en ${actividad.area}` : `Recepción de ${actividad.material}`}</div><div style={styles.actividadDetalle}><span>👤 {actividad.operador || actividad.receptor}</span><span>⚖️ {actividad.peso} kg</span></div></div>
                  <div style={styles.actividadFecha}>{actividad.fecha}</div>
                </div>
              ))
            ) : <div style={{textAlign: 'center', color: colors.gray500, padding: spacing.xl}}>No hay actividad reciente</div>}
          </div>
        </CardTransition>
      </div>
    </div>
  );

  return (
    <div style={styles.container}>
      {/* CORRECCIÓN: PageWrapper con height auto para que el contenido dicte la altura */}
      <PageWrapper style={{ height: 'auto' }}>
        <div style={styles.header}>
          <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
            <h1 style={styles.title}>Panel de Control Administrativo</h1>
          </div>

          <TabsAnimated
            tabs={[
              { id: 'overview', label: 'Métricas y Gráficas', content: <OverviewContent /> },
              { id: 'users', label: 'Gestión de Usuarios', content: <UserManagement /> }
            ]}
          />
        </div>
      </PageWrapper>
    </div>
  );
};

export default AdminDashboard;