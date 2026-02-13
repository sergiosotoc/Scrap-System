/* src/pages/AdminDashboard.js */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import UserManagement from '../components/UserManagement';
import MaterialesManagement from '../components/MaterialesManagement';
import AreasMaquinasManagement from '../components/AreasMaquinasManagement';
import CorreosManagement from '../components/CorreosManagement';
import { colors, spacing, typography, baseComponents, shadows } from '../styles/designSystem';
import PageWrapper from '../components/PageWrapper';
import LoadingSpinner from '../components/LoadingSpinner';
import CardTransition from '../components/CardTransition';
import TabsAnimated from '../components/TabsAnimated';

const AnimatedCounter = ({ value, duration = 1500, prefix = '' }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;
    const startValue = 0;
    const endValue = parseFloat(value) || 0;
    if (endValue === 0) { setCount(0); return; }

    const step = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);
      const easeOut = 1 - Math.pow(2, -10 * progress);
      setCount(easeOut * (endValue - startValue) + startValue);
      if (progress < 1) animationFrame = window.requestAnimationFrame(step);
    };
    animationFrame = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [value, duration]);

  return <span>{prefix}{count.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>;
};

const useIntersectionObserver = (options) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const ref = useRef(null);

  const memoizedOptions = useMemo(() => options || { threshold: 0.2, triggerOnce: true }, [options]);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsIntersecting(true);
        if (memoizedOptions.triggerOnce) {
          observer.disconnect();
        }
      }
    }, memoizedOptions);

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) observer.unobserve(currentRef);
    };
  }, [memoizedOptions]);

  return [ref, isIntersecting];
};

const BarChart = ({ data, meses }) => {
  const observerOptions = useMemo(() => ({ threshold: 0.3, triggerOnce: true }), []);
  const [ref, isVisible] = useIntersectionObserver(observerOptions);

  const height = 220; const width = 600; const padding = 40;
  const chartHeight = height - padding * 2; const chartWidth = width - padding * 2;
  const barWidth = 24;
  const gap = (chartWidth - (data.length * barWidth * 2)) / (data.length + 1);
  const maxValue = Math.max(...data.map(d => d.value), ...data.map(d => d.value2)) * 1.1 || 100;

  return (
    <div ref={ref} style={{ width: '100%', height: '100%' }}>
      <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
        {[0, 0.25, 0.5, 0.75, 1].map((tick, i) => (
          <g key={i} style={{ opacity: isVisible ? 0.4 : 0, transition: `opacity 0.5s ease ${i * 0.1}s` }}>
            <line x1={padding} y1={height - padding - (tick * chartHeight)} x2={width - padding} y2={height - padding - (tick * chartHeight)} stroke={colors.gray200} strokeWidth="1" />
            <text x={padding - 10} y={height - padding - (tick * chartHeight) + 4} textAnchor="end" fontSize="10" fill={colors.gray400} fontWeight="500">
              {isVisible ? <AnimatedCounter value={Math.round(tick * maxValue)} duration={1000} /> : 0}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          const groupX = padding + gap + (i * (barWidth * 2 + gap));
          const barHeight1 = (d.value / maxValue) * chartHeight;
          const barHeight2 = (d.value2 / maxValue) * chartHeight;

          return (
            <g key={i}>
              <rect
                x={groupX}
                y={height - padding - barHeight1}
                width={barWidth}
                height={barHeight1}
                fill={colors.primary}
                rx="4"
                style={{
                  transformOrigin: `center ${height - padding}px`,
                  transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: isVisible ? 1 : 0,
                  transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                  transitionDelay: `${i * 0.1}s`
                }}
              />
              <rect
                x={groupX + barWidth + 4}
                y={height - padding - barHeight2}
                width={barWidth}
                height={barHeight2}
                fill={colors.secondary}
                rx="4"
                style={{
                  transformOrigin: `center ${height - padding}px`,
                  transform: isVisible ? 'scaleY(1)' : 'scaleY(0)',
                  opacity: isVisible ? 1 : 0,
                  transition: 'transform 1s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
                  transitionDelay: `${(i * 0.1) + 0.1}s`
                }}
              />
              <text
                x={groupX + barWidth + 2}
                y={height - 15}
                textAnchor="middle"
                fontSize="11"
                fontWeight="600"
                fill={colors.gray500}
                style={{
                  opacity: isVisible ? 1 : 0,
                  transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
                  transition: `all 0.5s ease ${0.5 + (i * 0.1)}s`
                }}
              >
                {meses ? meses[i] : d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

const DonutChart = ({ data, total }) => {
  const observerOptions = useMemo(() => ({ threshold: 0.3, triggerOnce: true }), []);
  const [ref, isVisible] = useIntersectionObserver(observerOptions);

  const size = 200; const center = size / 2; const radius = 75; const strokeWidth = 25;
  let currentAngle = 0; const circumference = 2 * Math.PI * radius;

  return (
    <div ref={ref} style={{ position: 'relative', width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} style={{ transform: 'rotate(-90deg)' }}>
        {data.map((d, i) => {
          const sliceAngle = (d.value / total) * 360;
          const dash = (d.value / total) * circumference;
          const offset = -1 * (currentAngle / 360) * circumference;
          currentAngle += sliceAngle;
          return (
            <circle
              key={i}
              cx={center} cy={center} r={radius}
              fill="transparent"
              stroke={d.color || colors.primary}
              strokeWidth={strokeWidth}
              strokeDasharray={`${dash} ${circumference}`}
              strokeDashoffset={isVisible ? offset : circumference}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 1.5s cubic-bezier(0.22, 1, 0.36, 1)',
                transitionDelay: `${i * 0.15}s`
              }}
            />
          );
        })}
      </svg>
      <div style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: `translate(-50%, -50%) scale(${isVisible ? 1 : 0.5})`,
        opacity: isVisible ? 1 : 0,
        textAlign: 'center',
        transition: 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275) 0.8s'
      }}>
        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.gray800, lineHeight: 1 }}>
          {isVisible ? <AnimatedCounter value={total} decimals={0} /> : 0}
        </div>
        <div style={{ fontSize: '11px', color: colors.gray500, textTransform: 'uppercase', fontWeight: '600', marginTop: '4px' }}>kg Total</div>
      </div>
    </div>
  );
};

const AdminDashboard = () => {
  const { addToast } = useToast();
  const [stats, setStats] = useState(null);
  const [chartData, setChartData] = useState([]);
  const [distribucionData, setDistribucionData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [mesesGrafica, setMesesGrafica] = useState([]);
  const [actividadReciente, setActividadReciente] = useState([]);
  const [triggerAnimation, setTriggerAnimation] = useState(false);

  const dataFetchedRef = useRef(false);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiClient.getDashboardStats();
      console.log('📊 Datos recibidos del servidor:', data);

      if (!data) throw new Error("No se recibieron datos del servidor");

      if (data.grafica_barras && data.grafica_barras.meses) {
        const { meses, produccion, recepcion } = data.grafica_barras;
        const formattedChart = meses.map((mes, index) => ({
          label: mes,
          value: parseFloat(produccion[index]) || 0,
          value2: parseFloat(recepcion[index]) || 0
        }));
        setChartData(formattedChart);
        setMesesGrafica(meses);
      }

      if (data.distribucion_materiales) {
        const dist = Array.isArray(data.distribucion_materiales)
          ? data.distribucion_materiales
          : Object.values(data.distribucion_materiales);

        setDistribucionData(dist.map(item => ({
          name: item.name || 'Sin nombre',
          value: parseFloat(item.value) || 0,
          color: item.color || colors.primary
        })));
      }

      if (data.actividad_reciente) {
        const actividad = Array.isArray(data.actividad_reciente)
          ? data.actividad_reciente
          : Object.values(data.actividad_reciente);

        setActividadReciente(actividad);
      }

      setStats(data);
      setTimeout(() => setTriggerAnimation(true), 100);
    } catch (error) {
      console.error('❌ Error cargando Admin Stats:', error);
      addToast('Error al cargar estadísticas: ' + error.message, 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    if (dataFetchedRef.current) return;
    dataFetchedRef.current = true;
    loadData();
  }, [loadData]);

  const calcularTotalDistribucion = () => distribucionData.reduce((total, item) => total + (item.value || 0), 0);

  const styles = {
    container: { backgroundColor: colors.background, fontFamily: typography.fontFamily, boxSizing: 'border-box', width: '100%', minHeight: '100vh' },
    header: { marginBottom: spacing.xl },
    title: {
      fontSize: typography.sizes['3xl'],
      fontWeight: typography.weights.extrabold,
      color: colors.gray900,
      marginBottom: spacing.xs,
      background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
      backgroundClip: 'text',
      display: 'inline-block',
      lineHeight: 1.2
    },
    subtitle: { fontSize: typography.sizes.base, color: colors.gray500 },

    mainGrid: {
      display: 'grid',
      gridTemplateColumns: '2fr 1fr',
      gap: spacing.lg,
      marginBottom: spacing.xl,
      alignItems: 'stretch'
    },

    chartCard: {
      ...baseComponents.card,
      padding: spacing.lg,
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      minHeight: '380px',
      border: `1px solid ${colors.gray200}`,
      boxShadow: shadows.base
    },
    chartHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
    chartTitle: { fontSize: typography.sizes.lg, fontWeight: typography.weights.bold, color: colors.gray800 },

    legend: { display: 'flex', gap: spacing.md, fontSize: typography.sizes.xs },
    legendItem: { display: 'flex', alignItems: 'center', gap: '6px', color: colors.gray600, fontWeight: '500' },
    dot: (color) => ({ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: color }),

    pieWrapper: { display: 'flex', alignItems: 'center', justifyContent: 'center', gap: spacing.xl, height: '100%', flexWrap: 'wrap' },
    pieLegend: { display: 'flex', flexDirection: 'column', gap: '10px' },

    activityCard: { ...baseComponents.card, border: `1px solid ${colors.gray200}`, boxShadow: shadows.base, overflow: 'hidden' },
    activityHeader: { padding: `${spacing.md} ${spacing.lg}`, borderBottom: `1px solid ${colors.gray200}`, backgroundColor: colors.gray50 },
    activityList: { padding: 0, margin: 0 },
    activityItem: (index) => ({
      padding: `${spacing.md} ${spacing.lg}`,
      borderBottom: `1px solid ${colors.gray100}`,
      display: 'flex',
      alignItems: 'center',
      gap: spacing.md,
      transition: 'all 0.3s ease',
      backgroundColor: colors.surface,
      opacity: triggerAnimation ? 1 : 0,
      transform: triggerAnimation ? 'translateX(0)' : 'translateX(-10px)',
      transitionDelay: `${index * 0.05}s`
    }),
    iconCircle: (type) => ({
      width: '36px', height: '36px', borderRadius: '50%',
      backgroundColor: type === 'registro' ? `${colors.primary}15` : `${colors.secondary}15`,
      color: type === 'registro' ? colors.primary : colors.secondary,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0
    }),

    loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: '80vh', flexDirection: 'column', gap: spacing.md }
  };

  if (loading) return <div style={styles.loading}><LoadingSpinner message="Cargando panel de control..." /></div>;

  const OverviewContent = () => (
    <>
      <div style={{ ...styles.mainGrid, gridTemplateColumns: window.innerWidth < 1000 ? '1fr' : '2fr 1fr' }}>

        <CardTransition delay={100} style={styles.chartCard}>
          <div style={styles.chartHeader}>
            <div style={styles.chartTitle}>Producción vs Recepción (kg)</div>
            <div style={styles.legend}>
              <div style={styles.legendItem}><div style={styles.dot(colors.primary)}></div> Producción</div>
              <div style={styles.legendItem}><div style={styles.dot(colors.secondary)}></div> Recepción</div>
            </div>
          </div>
          <div style={{ flex: 1, minHeight: '220px' }}>
            {chartData.length > 0 ? <BarChart data={chartData} meses={mesesGrafica} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: colors.gray400 }}>Sin datos disponibles</div>}
          </div>
        </CardTransition>

        <CardTransition delay={200} style={styles.chartCard}>
          <div style={styles.chartHeader}><div style={styles.chartTitle}>Distribución de Materiales</div></div>
          <div style={styles.pieWrapper}>
            <DonutChart data={distribucionData} total={calcularTotalDistribucion()} />
            <div style={styles.pieLegend}>
              {distribucionData.map((d, i) => (
                <div key={i} style={{ ...styles.legendItem, fontSize: '0.8rem' }}>
                  <div style={styles.dot(d.color)}></div>
                  <span style={{ flex: 1 }}>{d.name}</span>
                  <strong style={{ color: colors.gray800 }}>
                    <AnimatedCounter value={d.value} decimals={0} /> kg
                  </strong>
                </div>
              ))}
            </div>
          </div>
        </CardTransition>
      </div>

      <CardTransition delay={300} style={styles.activityCard}>
        <div style={styles.activityHeader}>
          <h3 style={{ ...styles.chartTitle, fontSize: '1rem' }}>Actividad Reciente</h3>
        </div>
        <div style={styles.activityList}>
          {actividadReciente.length > 0 ? (
            actividadReciente.map((act, index) => (
              <div key={index} style={styles.activityItem(index)}>
                <div style={styles.iconCircle(act.tipo)}>
                  {act.tipo === 'registro' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Producción">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                      <line x1="12" y1="22.08" x2="12" y2="12"></line>
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" title="Recepción">
                      <polyline points="22 12 16 12 14 15 10 15 8 12 2 12"></polyline>
                      <path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"></path>
                    </svg>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: typography.sizes.sm, fontWeight: '600', color: colors.gray800 }}>
                    {act.tipo === 'registro'
                      ? `Producción: ${act.material}`
                      : `Recepción: ${act.material}`}
                  </div>

                  <div style={{ fontSize: '0.75rem', color: colors.gray500, display: 'flex', gap: '12px', marginTop: '2px' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                      </svg>
                      {act.tipo === 'registro' ? act.operador : act.receptor}
                    </span>

                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M20 12V8H6a2 2 0 0 1-2-2 2 2 0 0 1 2-2h12v4"></path>
                        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4"></path>
                        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4V12h-4z"></path>
                      </svg>
                      {parseFloat(act.peso).toFixed(2)} kg
                    </span>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', color: colors.gray400, fontWeight: '500' }}>
                  {act.fecha}
                </div>
              </div>
            ))
          ) : (
            <div style={{ padding: spacing.xl, textAlign: 'center', color: colors.gray400 }}>
              No hay actividad reciente para mostrar
            </div>
          )}
        </div>
      </CardTransition>
    </>
  );

  return (
    <div style={styles.container}>
      <PageWrapper style={{ height: 'auto' }}>
        <div style={styles.header}>
          <h1 style={styles.title}>Panel de Control Administrativo</h1>
          <p style={styles.subtitle}>Visión general del rendimiento y operaciones.</p>
        </div>

        <TabsAnimated
          tabs={[
            { id: 'overview', label: 'Resumen General', content: <OverviewContent /> },
            { id: 'users', label: 'Gestión de Usuarios', content: <UserManagement /> },
            { id: 'areas', label: 'Config. Áreas/Máquinas', content: <AreasMaquinasManagement /> },
            { id: 'materiales', label: 'Catálogo Materiales', content: <MaterialesManagement /> },
            { id: 'correos', label: 'Destinatarios Correo', content: <CorreosManagement /> }
          ]}
        />
      </PageWrapper>
    </div>
  );
};

export default AdminDashboard;