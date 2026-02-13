/* src/pages/ContraloriaDashboard.js - VERSIÓN MEJORADA */
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { apiClient } from '../services/api';
import { useToast } from '../context/ToastContext';
import { colors, spacing, typography, baseComponents, radius, shadows } from '../styles/designSystem';
import PageWrapper from '../components/PageWrapper';
import LoadingSpinner from '../components/LoadingSpinner';
import CardTransition from '../components/CardTransition';
import SmoothInput from '../components/SmoothInput';
import SmoothSelect from '../components/SmoothSelect';
import SmoothButton from '../components/SmoothButton';
import TabsAnimated from '../components/TabsAnimated';

const AnimatedCounter = ({ value, duration = 1000, decimals = 2 }) => {
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
            else setCount(endValue);
        };
        animationFrame = window.requestAnimationFrame(step);
        return () => window.cancelAnimationFrame(animationFrame);
    }, [value, duration]);
    return <span>{count.toLocaleString(undefined, { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}</span>;
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => {
    if (totalPages <= 1) return null;
    const pageNumbers = [];
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
    }
    return (
        <div style={styles.paginationContainer}>
            <SmoothButton onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} variant="secondary" style={styles.pageNavBtn}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6" /></svg> Anterior
            </SmoothButton>
            <div style={{ display: 'flex', gap: '6px' }}>
                {startPage > 1 && (
                    <>
                        <SmoothButton onClick={() => onPageChange(1)} variant="secondary" style={pageButtonStyle(1 === currentPage)}>1</SmoothButton>
                        {startPage > 2 && <span style={styles.ellipsis}>...</span>}
                    </>
                )}
                {pageNumbers.map(page => (
                    <SmoothButton key={page} onClick={() => onPageChange(page)} variant="secondary" style={pageButtonStyle(page === currentPage)}>{page}</SmoothButton>
                ))}
                {endPage < totalPages && (
                    <>
                        {endPage < totalPages - 1 && <span style={styles.ellipsis}>...</span>}
                        <SmoothButton onClick={() => onPageChange(totalPages)} variant="secondary" style={pageButtonStyle(totalPages === currentPage)}>{totalPages}</SmoothButton>
                    </>
                )}
            </div>
            <SmoothButton onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} variant="secondary" style={styles.pageNavBtn}>
                Siguiente <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginLeft: '4px' }}><path d="M9 18l6-6-6-6" /></svg>
            </SmoothButton>
        </div>
    );
};

const ContraloriaDashboard = () => {
    const { addToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [exportando, setExportando] = useState(false);
    const [auditData, setAuditData] = useState(null);
    const [triggerAnimation, setTriggerAnimation] = useState(false);
    const [observacionActiva, setObservacionActiva] = useState(null);
    const [historialModificaciones, setHistorialModificaciones] = useState([]);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(20);
    const today = new Date().toISOString().split('T')[0];
    const [fechaInicio, setFechaInicio] = useState(today);
    const [fechaFin, setFechaFin] = useState(today);
    const [filtroTipo, setFiltroTipo] = useState('todos');
    const [filtroMaterial, setFiltroMaterial] = useState('');

    const loadAudit = useCallback(async () => {
        setLoading(true);
        setTriggerAnimation(false);
        setCurrentPage(1);
        try {
            const data = await apiClient.getContraloriaStats(fechaInicio, fechaFin);
            setAuditData(data);
            setTimeout(() => setTriggerAnimation(true), 100);
            if (!data.movimientos || data.movimientos.length === 0) {
                addToast('No hay registros para este periodo', 'info');
            }
        } catch (error) {
            addToast('Error al conectar con el servidor', 'error');
        } finally {
            setLoading(false);
        }
    }, [fechaInicio, fechaFin, addToast]);

    const loadHistorialModificaciones = useCallback(async () => {
        setCargandoHistorial(true);
        try {
            const response = await apiClient.getHistorialModificaciones({
                fecha_inicio: fechaInicio,
                fecha_fin: fechaFin,
                tipo: filtroTipo,
                material: filtroMaterial
            });
            setHistorialModificaciones(response.historial || []);
        } catch (error) {
            addToast('Error al cargar historial', 'error');
        } finally {
            setCargandoHistorial(false);
        }
    }, [fechaInicio, fechaFin, filtroTipo, filtroMaterial, addToast]);

    useEffect(() => {
        loadAudit();
        loadHistorialModificaciones();
    }, []);

    const paginatedData = useMemo(() => {
        if (!auditData?.movimientos) return [];
        const startIndex = (currentPage - 1) * itemsPerPage;
        return auditData.movimientos.slice(startIndex, startIndex + itemsPerPage);
    }, [auditData, currentPage, itemsPerPage]);

    const totalPages = useMemo(() => {
        if (!auditData?.movimientos) return 0;
        return Math.ceil(auditData.movimientos.length / itemsPerPage);
    }, [auditData, itemsPerPage]);

    const statsContraloria = useMemo(() => {
        if (!auditData?.movimientos) return null;

        const movimientos = auditData.movimientos;

        const diferenciasPorMaterial = {};
        movimientos.forEach(mov => {
            const material = mov.material;
            const tipo = mov.origen === 'PLANTA' ? 'produccion' : 'recepcion';

            if (!diferenciasPorMaterial[material]) {
                diferenciasPorMaterial[material] = {
                    produccion: 0,
                    recepcion: 0,
                    diferencia: 0
                };
            }

            if (tipo === 'produccion') {
                diferenciasPorMaterial[material].produccion += mov.peso;
            } else {
                diferenciasPorMaterial[material].recepcion += mov.peso;
            }

            diferenciasPorMaterial[material].diferencia =
                diferenciasPorMaterial[material].produccion -
                diferenciasPorMaterial[material].recepcion;
        });

        const basculaCount = movimientos.filter(m => m.conexion_bascula === true).length;
        const manualCount = movimientos.filter(m => m.conexion_bascula === false).length;

        const discrepancias = Object.entries(diferenciasPorMaterial)
            .filter(([_, data]) => Math.abs(data.diferencia) > 0.5)
            .sort((a, b) => Math.abs(b[1].diferencia) - Math.abs(a[1].diferencia))
            .slice(0, 5);

        return {
            diferenciasPorMaterial,
            controlMetodos: {
                bascula: basculaCount,
                manual: manualCount,
                porcentajeBascula: movimientos.length > 0 ? ((basculaCount / movimientos.length) * 100).toFixed(1) : 0
            },
            topDiscrepancias: discrepancias,
            totalMovimientos: movimientos.length
        };
    }, [auditData]);

    const parseObservaciones = (observaciones) => {
        if (!observaciones || observaciones === 'Proceso Automático') return null;

        const partes = {
            area: null,
            maquina: null,
            material: null,
            notas: []
        };

        const lines = observaciones.split(' | ');

        lines.forEach(line => {
            if (line.includes('Área:')) partes.area = line.replace('Área:', '').trim();
            else if (line.includes('Máquina:')) partes.maquina = line.replace('Máquina:', '').trim();
            else if (line.includes('Material:')) partes.material = line.replace('Material:', '').trim();
            else if (line.trim()) partes.notas.push(line.trim());
        });

        return partes;
    };

    const handlePageChange = (page) => {
        setCurrentPage(page);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDownloadExcel = async () => {
        if (!auditData?.movimientos?.length) {
            addToast('No hay datos para exportar', 'warning');
            return;
        }
        setExportando(true);
        addToast('Generando reporte Excel...', 'info');
        try {
            const token = localStorage.getItem('authToken');
            const baseUrl = process.env.REACT_APP_API_URL || `${window.location.protocol}//${window.location.hostname}:8002/api`;
            const url = `${baseUrl}/excel/export-auditoria?fecha_inicio=${fechaInicio}&fecha_fin=${fechaFin}`;
            const response = await fetch(url, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                }
            });
            if (!response.ok) throw new Error('Error al generar el archivo');
            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `AUDITORIA_SCRAP_${fechaInicio}_AL_${fechaFin}.xlsx`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(downloadUrl);
            addToast('Reporte descargado exitosamente', 'success');
        } catch (error) {
            addToast('Error al descargar el reporte', 'error');
        } finally {
            setExportando(false);
        }
    };

    const getOrigenStyle = (origen) => {
        const isPlanta = origen?.toUpperCase() === 'PLANTA';
        return {
            color: isPlanta ? '#1E40AF' : '#065F46',
            bg: isPlanta ? '#DBEAFE' : '#D1FAE5',
            border: isPlanta ? '#BFDBFE' : '#A7F3D0'
        };
    };

    const getResponsableStyle = (rol) => {
        const isOperador = rol === 'Operador';
        return {
            color: isOperador ? '#7C3AED' : '#059669',
            bg: isOperador ? '#F3E8FF' : '#D1FAE5',
            border: isOperador ? '#E9D5FF' : '#A7F3D0'
        };
    };

    const tabs = [
        {
            id: 'conciliacion',
            label: 'Conciliación',
            content: (
                <>
                    <div style={styles.kpiGrid}>
                        <CardTransition delay={100} style={styles.kpiCard(colors.primary)}>
                            <small style={{ color: colors.gray500, fontWeight: '700' }}>PRODUCCIÓN TOTAL</small>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: colors.primary }}>
                                <AnimatedCounter value={auditData?.totales?.produccion} />
                                <small style={{ fontSize: '1rem' }}> kg</small>
                            </div>
                        </CardTransition>

                        <CardTransition delay={200} style={styles.kpiCard(colors.secondary)}>
                            <small style={{ color: colors.gray500, fontWeight: '700' }}>RECEPCIÓN TOTAL</small>
                            <div style={{ fontSize: '1.8rem', fontWeight: '800', color: colors.secondary }}>
                                <AnimatedCounter value={auditData?.totales?.recepcion} />
                                <small style={{ fontSize: '1rem' }}> kg</small>
                            </div>
                        </CardTransition>

                        <CardTransition delay={300} style={styles.kpiCard(
                            auditData?.totales?.diferencia !== 0 ? colors.error : colors.success
                        )}>
                            <small style={{ color: colors.gray500, fontWeight: '700' }}>DIFERENCIA</small>
                            <div style={{
                                fontSize: '1.8rem',
                                fontWeight: '800',
                                color: auditData?.totales?.diferencia !== 0 ? colors.error : colors.success
                            }}>
                                <AnimatedCounter value={auditData?.totales?.diferencia} />
                                <small style={{ fontSize: '1rem' }}> kg</small>
                            </div>
                        </CardTransition>
                    </div>

                    <CardTransition delay={500} style={styles.tableCard}>
                        <div style={styles.resultsHeader}>
                            <div style={styles.resultsCount}>
                                Visualizando <strong>{auditData?.movimientos?.length || 0}</strong> movimientos de inventario
                            </div>
                            <div style={styles.pageInfo}>Página {currentPage} de {totalPages}</div>
                        </div>

                        <div style={styles.tableWrapper}>
                            <table style={styles.table}>
                                <thead>
                                    <tr>
                                        <th style={styles.th}>Folio/HU</th>
                                        <th style={styles.th}>Fecha</th>
                                        <th style={styles.th}>Turno</th>
                                        <th style={styles.th}>Material</th>
                                        <th style={{ ...styles.th, textAlign: 'right' }}>Peso (kg)</th>
                                        <th style={styles.th}>Origen</th>
                                        <th style={styles.th}>Responsable</th>
                                        <th style={styles.th}>Destino</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paginatedData.map((mov, i) => {
                                        const globalIndex = (currentPage - 1) * itemsPerPage + i;
                                        const origenStyle = getOrigenStyle(mov.origen);
                                        const responsableStyle = getResponsableStyle(mov.rol);

                                        return (
                                            <tr key={`${mov.hu_id}-${globalIndex}`} style={styles.row(globalIndex)}>
                                                <td style={{ ...styles.td, fontWeight: 'bold', color: colors.primary }}>
                                                    {mov.hu_id || <span style={{ opacity: 0.4 }}>PROD-INT</span>}
                                                </td>
                                                <td style={styles.td}>
                                                    {new Date(mov.fecha).toLocaleDateString()}
                                                    <div style={{ fontSize: '0.7rem', color: colors.gray400 }}>
                                                        {new Date(mov.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </td>
                                                <td style={styles.td}><span style={styles.turnoBadge}>T{mov.turno}</span></td>
                                                <td style={styles.td}>
                                                    <strong>{mov.material}</strong>
                                                </td>
                                                <td style={{ ...styles.weightCell, borderLeft: 'none', cursor: 'default' }}>
                                                    <strong>{mov.peso.toFixed(3)}</strong>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={styles.originBadge(origenStyle)}>{mov.origen}</span>
                                                </td>
                                                <td style={styles.td}>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                        <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{mov.responsable}</span>
                                                        <span style={styles.rolBadge(responsableStyle)}>{mov.rol}</span>
                                                    </div>
                                                </td>
                                                <td style={styles.td}>
                                                    <span style={styles.destinoText}>{mov.destino_display || mov.destino}</span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
                    </CardTransition>
                </>
            )
        },
        {
            id: 'historial',
            label: 'Historial de Modificaciones',
            content: (
                <CardTransition delay={100} style={styles.tableCard}>
                    <div style={{
                        padding: spacing.lg,
                        backgroundColor: colors.gray50,
                        borderBottom: `1px solid ${colors.gray200}`,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.md
                    }}>
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                            gap: spacing.md,
                            alignItems: 'flex-end'
                        }}>
                            <div>
                                <SmoothSelect
                                    label="Módulo"
                                    value={filtroTipo}
                                    onChange={(e) => setFiltroTipo(e.target.value)}
                                >
                                    <option value="todos">Todos los tipos</option>
                                    <option value="produccion">Producción</option>
                                    <option value="recepcion">Recepción</option>
                                </SmoothSelect>
                            </div>

                            <div>
                                <SmoothInput
                                    label="Desde"
                                    type="date"
                                    value={fechaInicio}
                                    onChange={(e) => setFechaInicio(e.target.value)}
                                />
                            </div>

                            <div>
                                <SmoothInput
                                    label="Hasta"
                                    type="date"
                                    value={fechaFin}
                                    onChange={(e) => setFechaFin(e.target.value)}
                                />
                            </div>

                            <div>
                                <SmoothInput
                                    label="Material"
                                    value={filtroMaterial}
                                    onChange={(e) => setFiltroMaterial(e.target.value)}
                                    placeholder="Ej: Cobre, PVC..."
                                    rightElement={
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.gray400} strokeWidth="2.5">
                                            <circle cx="11" cy="11" r="8"></circle>
                                            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                                        </svg>
                                    }
                                />
                            </div>

                            <div style={{ display: 'flex' }}>
                                <SmoothButton
                                    onClick={loadHistorialModificaciones}
                                    disabled={cargandoHistorial}
                                    style={{ height: '42px', width: '100%', justifyContent: 'center' }}
                                >
                                    {cargandoHistorial ? 'Buscando...' : 'Aplicar Filtros'}
                                </SmoothButton>
                            </div>
                        </div>
                    </div>

                    <div style={styles.resultsHeader}>
                        <div style={styles.resultsCount}>
                            Auditando <strong>{historialModificaciones.length}</strong> eventos de modificación desglosados
                        </div>
                        {filtroMaterial && (
                            <span style={{
                                fontSize: '0.7rem',
                                backgroundColor: colors.primary + '15',
                                color: colors.primary,
                                padding: '2px 8px',
                                borderRadius: radius.full,
                                fontWeight: 'bold'
                            }}>
                                Filtrado por: {filtroMaterial.toUpperCase()}
                            </span>
                        )}
                    </div>

                    <div style={styles.tableWrapper}>
                        <table style={styles.table}>
                            <thead>
                                <tr>
                                    <th style={styles.th}>Fecha y Hora</th>
                                    <th style={styles.th}>Tipo</th>
                                    <th style={styles.th}>Material</th>
                                    <th style={styles.th}>Detalle Desglosado de Operación</th>
                                    <th style={styles.th}>Responsable</th>
                                </tr>
                            </thead>
                            <tbody>
                                {historialModificaciones.length > 0 ? (
                                    historialModificaciones.map((mod, index) => (
                                        <tr key={mod.id || index} style={styles.row(index)}>
                                            <td style={styles.td}>
                                                <div style={{ fontWeight: 'bold' }}>{new Date(mod.fecha).toLocaleDateString()}</div>
                                                <div style={{ fontSize: '0.7rem', color: colors.gray400 }}>
                                                    {new Date(mod.fecha).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <span style={{
                                                    padding: '4px 8px',
                                                    borderRadius: radius.sm,
                                                    fontSize: '0.7rem',
                                                    fontWeight: 'bold',
                                                    backgroundColor: mod.tipo_accion === 'SUMA' ? '#D1FAE5' : (mod.tipo_accion === 'BORRADO' ? '#FEE2E2' : '#FEF3C7'),
                                                    color: mod.tipo_accion === 'SUMA' ? '#065F46' : (mod.tipo_accion === 'BORRADO' ? '#991B1B' : '#92400E'),
                                                    display: 'inline-block',
                                                    minWidth: '70px',
                                                    textAlign: 'center'
                                                }}>
                                                    {mod.tipo_accion}
                                                </span>
                                            </td>
                                            <td style={styles.td}>
                                                <strong style={{ color: colors.primary, textTransform: 'uppercase' }}>
                                                    {mod.material}
                                                </strong>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{
                                                    padding: '10px',
                                                    backgroundColor: colors.gray50,
                                                    borderRadius: radius.md,
                                                    borderLeft: `4px solid ${mod.tipo_accion === 'SUMA' ? colors.success : (mod.tipo_accion === 'BORRADO' ? colors.error : colors.warning)}`,
                                                    fontSize: '0.85rem',
                                                    color: colors.gray700,
                                                    lineHeight: '1.4',
                                                    boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.02)'
                                                }}>
                                                    {mod.detalle_personalizado}
                                                </div>
                                            </td>
                                            <td style={styles.td}>
                                                <div style={{ fontWeight: '500' }}>{mod.responsable}</div>
                                                <div style={{ fontSize: '0.7rem', color: colors.gray400 }}>ID Reg: {mod.registro_id}</div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" style={{ padding: '60px', textAlign: 'center' }}>
                                            <div style={{ color: colors.gray400 }}>
                                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ marginBottom: spacing.sm }}>
                                                    <circle cx="12" cy="12" r="10"></circle>
                                                    <line x1="12" y1="8" x2="12" y2="12"></line>
                                                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                                                </svg>
                                                <p>No se encontraron registros de auditoría para los filtros seleccionados.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </CardTransition>
            )
        }
    ];

    return (
        <PageWrapper>
            <div style={styles.headerSection}>
                <h1 style={styles.title}>Módulo de Contraloría y Auditoría</h1>
                <p style={{ color: colors.gray500, marginTop: '4px' }}>
                    Conciliación y control de inventarios de scrap - Producción vs Almacén
                </p>
            </div>

            <CardTransition delay={0}>
                <div style={styles.filterBar}>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <SmoothInput
                            label="Fecha Inicial"
                            type="date"
                            value={fechaInicio}
                            onChange={(e) => setFechaInicio(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: 1, minWidth: '200px' }}>
                        <SmoothInput
                            label="Fecha Final"
                            type="date"
                            value={fechaFin}
                            onChange={(e) => setFechaFin(e.target.value)}
                        />
                    </div>
                    <SmoothButton
                        onClick={() => {
                            loadAudit();
                            loadHistorialModificaciones();
                        }}
                        disabled={loading}
                        style={{ height: '42px', padding: '0 24px' }}
                    >
                        {loading ? 'Cargando...' : 'Consultar'}
                    </SmoothButton>
                    <SmoothButton
                        onClick={handleDownloadExcel}
                        variant="secondary"
                        disabled={exportando || !auditData?.movimientos?.length}
                        style={{ height: '42px', border: `1.5px solid ${colors.secondary}`, color: colors.secondary }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '8px' }}>
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        Reporte Excel
                    </SmoothButton>
                </div>
            </CardTransition>

            {loading ? (
                <LoadingSpinner message="Calculando diferencias de inventario..." />
            ) : (
                <TabsAnimated tabs={tabs} />
            )}

            {observacionActiva && (
                <div style={styles.modalOverlay} onClick={() => setObservacionActiva(null)}>
                    <CardTransition style={styles.modalContent} onClick={e => e.stopPropagation()}>
                        <div style={styles.modalHeader}>
                            <h3 style={styles.modalTitle}>
                                {observacionActiva.origen === 'PLANTA' ? 'Detalles de Producción' : 'Detalles de Recepción'}
                            </h3>
                            <button onClick={() => setObservacionActiva(null)} style={styles.closeBtn}>×</button>
                        </div>
                        <div style={styles.modalBody}>
                            <div style={styles.modalInfoGrid}>
                                <div style={styles.infoBox}>
                                    <label style={styles.infoLabel}>Material</label>
                                    <div style={styles.infoValue}>{observacionActiva.material}</div>
                                </div>
                                <div style={styles.infoBox}>
                                    <label style={styles.infoLabel}>Peso</label>
                                    <div style={styles.infoValue}>
                                        <strong style={{ color: colors.primary, fontSize: '1.2rem' }}>
                                            {observacionActiva.peso.toFixed(3)} kg
                                        </strong>
                                    </div>
                                </div>
                                <div style={styles.infoBox}>
                                    <label style={styles.infoLabel}>Origen</label>
                                    <div style={styles.infoValue}>
                                        <span style={styles.originBadge(getOrigenStyle(observacionActiva.origen))}>
                                            {observacionActiva.origen}
                                        </span>
                                    </div>
                                </div>
                                <div style={styles.infoBox}>
                                    <label style={styles.infoLabel}>Responsable</label>
                                    <div style={styles.infoValue}>
                                        {observacionActiva.responsable}
                                        <div style={{ fontSize: '0.8rem', color: colors.gray500 }}>
                                            ({observacionActiva.rol})
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <hr style={styles.divider} />

                            {(() => {
                                const observacionesParseadas = parseObservaciones(observacionActiva.observaciones);
                                if (!observacionesParseadas) return null;

                                return (
                                    <div style={styles.observacionesSection}>
                                        <h4 style={styles.observacionesTitle}>📝 Observaciones Detalladas</h4>
                                        <div style={styles.observacionesGrid}>
                                            {observacionesParseadas.area && (
                                                <div style={styles.obsItem}>
                                                    <label style={styles.obsLabel}>Área:</label>
                                                    <span style={styles.obsValue}>{observacionesParseadas.area}</span>
                                                </div>
                                            )}
                                            {observacionesParseadas.maquina && (
                                                <div style={styles.obsItem}>
                                                    <label style={styles.obsLabel}>Máquina:</label>
                                                    <span style={styles.obsValue}>{observacionesParseadas.maquina}</span>
                                                </div>
                                            )}
                                            {observacionesParseadas.material && (
                                                <div style={styles.obsItem}>
                                                    <label style={styles.obsLabel}>Material:</label>
                                                    <span style={styles.obsValue}>{observacionesParseadas.material}</span>
                                                </div>
                                            )}
                                        </div>

                                        {observacionesParseadas.notas.length > 0 && (
                                            <div style={styles.notasSection}>
                                                <label style={styles.obsLabel}>Notas adicionales:</label>
                                                <div style={styles.notasList}>
                                                    {observacionesParseadas.notas.map((nota, index) => (
                                                        <div key={index} style={styles.notaItem}>
                                                            <span style={styles.notaBullet}>•</span>
                                                            <span style={styles.notaText}>{nota}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })()}
                        </div>
                    </CardTransition>
                </div>
            )}
        </PageWrapper>
    );
};

const styles = {
    container: { padding: spacing.lg, backgroundColor: colors.background, minHeight: '100vh' },
    headerSection: { marginBottom: spacing.xl },
    title: {
        fontSize: typography.sizes['3xl'],
        fontWeight: '800',
        margin: 0,
        background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.secondary} 100%)`,
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent'
    },
    filterBar: {
        ...baseComponents.card,
        padding: spacing.lg,
        display: 'flex',
        gap: spacing.md,
        alignItems: 'flex-end',
        marginBottom: spacing.xl,
        flexWrap: 'wrap',
        border: `1px solid ${colors.gray200}`
    },
    kpiGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: spacing.lg,
        marginBottom: spacing.xl
    },
    kpiCard: (color) => ({
        ...baseComponents.card,
        padding: spacing.lg,
        borderLeft: `6px solid ${color}`,
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
    }),
    kpiSubtitle: {
        fontSize: '0.8rem',
        color: colors.gray600,
        marginTop: '4px',
        borderTop: `1px solid ${colors.gray100}`,
        paddingTop: '6px'
    },
    discrepanciasCard: {
        ...baseComponents.card,
        padding: spacing.lg,
        marginBottom: spacing.xl,
        border: `1px solid ${colors.warning}30`,
        backgroundColor: `${colors.warning}08`
    },
    discrepanciasGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing.md,
        marginTop: spacing.md
    },
    discrepanciaItem: {
        padding: spacing.md,
        backgroundColor: colors.white,
        borderRadius: radius.md,
        border: `1px solid ${colors.gray200}`,
        boxShadow: shadows.sm
    },
    discrepanciaMaterial: {
        fontSize: '0.9rem',
        fontWeight: 'bold',
        color: colors.gray800,
        marginBottom: spacing.sm,
        borderBottom: `1px solid ${colors.gray100}`,
        paddingBottom: '4px'
    },
    discrepanciaValores: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    valorRow: {
        display: 'flex',
        justifyContent: 'space-between',
        fontSize: '0.8rem'
    },
    tableCard: {
        ...baseComponents.card,
        border: `1px solid ${colors.gray200}`,
        boxShadow: shadows.md,
        overflow: 'visible'
    },
    cardHeader: {
        padding: spacing.md,
        borderBottom: `1px solid ${colors.gray200}`,
        marginBottom: spacing.md
    },
    cardTitle: {
        fontSize: typography.sizes.lg,
        fontWeight: 'bold',
        color: colors.gray800,
        margin: 0
    },
    resultsHeader: {
        padding: `${spacing.sm} ${spacing.md}`,
        display: 'flex',
        justifyContent: 'space-between',
        backgroundColor: colors.gray50,
        borderBottom: `1px solid ${colors.gray200}`
    },
    resultsCount: { fontSize: typography.sizes.xs, color: colors.gray600 },
    pageInfo: { fontSize: typography.sizes.xs, fontWeight: 'bold', color: colors.primary },
    tableWrapper: { width: '100%', overflowX: 'auto' },
    table: { width: '100%', borderCollapse: 'collapse', minWidth: '1000px' },
    th: {
        backgroundColor: colors.white,
        color: colors.gray500,
        fontSize: '0.65rem',
        fontWeight: '800',
        textTransform: 'uppercase',
        padding: spacing.md,
        textAlign: 'left',
        borderBottom: `1px solid ${colors.gray200}`,
        letterSpacing: '0.5px'
    },
    td: {
        padding: spacing.md,
        fontSize: '0.85rem',
        borderBottom: `1px solid ${colors.gray100}`,
        color: colors.gray800
    },
    row: (i) => ({
        backgroundColor: i % 2 === 0 ? colors.white : '#fcfcfc',
        transition: 'all 0.2s',
        ':hover': {
            backgroundColor: '#f5f5f5'
        }
    }),
    weightCell: {
        padding: spacing.md,
        fontSize: '0.85rem',
        textAlign: 'right',
        fontWeight: 'bold',
        fontFamily: typography.fontMono,
        borderBottom: `1px solid ${colors.gray100}`
    },
    weightCellAlert: {
        backgroundColor: colors.warning + '15',
        color: colors.error,
        cursor: 'pointer',
        boxShadow: `inset 0 0 0 1px ${colors.warning}30`
    },
    turnoBadge: {
        backgroundColor: colors.gray100,
        color: colors.gray600,
        padding: '2px 6px',
        borderRadius: radius.sm,
        fontSize: '0.7rem',
        fontWeight: 'bold'
    },
    originBadge: (s) => ({
        fontWeight: 'bold',
        fontSize: '0.65rem',
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        padding: '2px 8px',
        borderRadius: radius.full,
        textTransform: 'uppercase',
        display: 'inline-block'
    }),
    rolBadge: (s) => ({
        fontSize: '0.6rem',
        color: s.color,
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
        padding: '1px 6px',
        borderRadius: radius.sm,
        textTransform: 'uppercase',
        display: 'inline-block',
        width: 'fit-content'
    }),
    metodoBadge: (isBascula) => ({
        fontSize: '0.65rem',
        color: isBascula ? colors.success : colors.gray600,
        backgroundColor: isBascula ? `${colors.success}15` : colors.gray100,
        border: `1px solid ${isBascula ? colors.success : colors.gray300}`,
        padding: '2px 8px',
        borderRadius: radius.full,
        fontWeight: '600'
    }),
    badgeProduccion: {
        backgroundColor: `${colors.primary}15`,
        color: colors.primary,
        padding: '2px 8px',
        borderRadius: radius.sm,
        fontSize: '0.7rem',
        fontWeight: 'bold'
    },
    badgeRecepcion: {
        backgroundColor: `${colors.secondary}15`,
        color: colors.secondary,
        padding: '2px 8px',
        borderRadius: radius.sm,
        fontSize: '0.7rem',
        fontWeight: 'bold'
    },
    destinoText: {
        fontSize: '0.7rem',
        fontWeight: '600',
        color: colors.gray500,
        textTransform: 'uppercase'
    },
    paginationContainer: {
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: spacing.sm,
        padding: spacing.md,
        backgroundColor: colors.gray50
    },
    pageNavBtn: {
        padding: '6px 12px',
        minWidth: 'auto',
        fontSize: '0.8rem',
        gap: '4px'
    },
    ellipsis: {
        padding: '0 4px',
        color: colors.gray400
    },

    modalOverlay: {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)',
        zIndex: 2000,
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        backdropFilter: 'blur(3px)'
    },
    modalContent: {
        backgroundColor: '#ffffff',
        padding: spacing.xl,
        borderRadius: radius.lg,
        width: '90%',
        maxWidth: '700px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
        position: 'relative',
        border: `1px solid ${colors.gray200}`
    },
    modalHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
        paddingBottom: spacing.md,
        borderBottom: `2px solid ${colors.gray100}`
    },
    modalTitle: {
        fontSize: typography.sizes.xl,
        fontWeight: '800',
        color: colors.gray900,
        margin: 0
    },
    closeBtn: {
        background: 'none',
        border: 'none',
        fontSize: '1.8rem',
        color: colors.gray400,
        cursor: 'pointer',
        padding: '0 4px',
        lineHeight: 1
    },
    modalBody: {
        maxHeight: '70vh',
        overflowY: 'auto'
    },
    modalInfoGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: spacing.md,
        marginBottom: spacing.lg
    },
    infoBox: {
        padding: spacing.sm,
        backgroundColor: colors.gray50,
        borderRadius: radius.md
    },
    infoLabel: {
        fontSize: '0.75rem',
        fontWeight: 'bold',
        color: colors.gray500,
        textTransform: 'uppercase',
        marginBottom: '4px'
    },
    infoValue: {
        fontSize: '0.9rem',
        color: colors.gray800
    },
    divider: {
        border: 'none',
        borderTop: `1px solid ${colors.gray100}`,
        margin: `${spacing.lg} 0`
    },

    observacionesSection: {
        marginTop: spacing.lg
    },
    observacionesTitle: {
        fontSize: '1rem',
        fontWeight: 'bold',
        color: colors.gray800,
        marginBottom: spacing.md
    },
    observacionesGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: spacing.md,
        marginBottom: spacing.lg
    },
    obsItem: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    obsLabel: {
        fontSize: '0.75rem',
        fontWeight: '600',
        color: colors.gray600,
        textTransform: 'uppercase'
    },
    obsValue: {
        fontSize: '0.9rem',
        color: colors.gray800,
        fontWeight: '500'
    },
    notasSection: {
        marginTop: spacing.md
    },
    notasList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        marginTop: spacing.sm
    },
    notaItem: {
        display: 'flex',
        gap: spacing.sm,
        alignItems: 'flex-start'
    },
    notaBullet: {
        color: colors.warning,
        fontWeight: 'bold'
    },
    notaText: {
        fontSize: '0.85rem',
        color: colors.gray700,
        lineHeight: 1.4
    }
};

const pageButtonStyle = (isActive) => ({
    padding: '6px 10px',
    minWidth: '34px',
    fontSize: '0.8rem',
    fontWeight: 'bold',
    backgroundColor: isActive ? colors.primary : colors.white,
    color: isActive ? colors.white : colors.gray700,
    borderColor: isActive ? colors.primary : colors.gray300,
    boxShadow: isActive ? shadows.sm : 'none'
});

export default ContraloriaDashboard;