/* src/components/AdminReportView.js */
import React, { useState, useEffect } from 'react';
import { apiClient } from '../services/api';
import { colors, radius, spacing, typography, shadows } from '../styles/designSystem';
import LoadingSpinner from './LoadingSpinner';

const AdminReportView = ({ fecha, turno, onDataLoaded }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReportData = async () => {
            setLoading(true);
            try {
                const response = await apiClient.getPreviewReporte({ fecha, turno });
                setData(response);

                if (onDataLoaded) {
                    onDataLoaded(response.granTotal > 0);
                }
            } catch (error) {
                console.error("Error al cargar reporte:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchReportData();
    }, [fecha, turno, onDataLoaded]);

    if (loading) 
        return <LoadingSpinner message="Cargando historial de scrap..." />;
    if (!data || data.rows.length === 0) 
        return 
            <div style={{
                        textAlign:'center', 
                        padding: '40px', 
                        color: colors.gray500}}>
                            No hay registros para la fecha y turno seleccionados.
            </div>;

    return (
        <div style={styles.wrapper}>
            <div style={styles.reportHeader}>
                <div style={styles.headerInfoBlock}>
                    <div style={styles.infoItem}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: colors.primary}}>
                            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                            <circle cx="12" cy="7" r="4"></circle>
                        </svg>
                        <span style={styles.infoLabel}>Operador responsable:</span>
                        <span style={styles.infoValue}>{data.operador}</span>
                    </div>
                    <div style={styles.infoItem}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{color: colors.primary}}>
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span style={styles.infoLabel}>Turno consultado:</span>
                        <span style={styles.infoValue}>
                            {data.turno === 'Todos' ? 'Consolidado General' : `Turno ${data.turno}`}
                        </span>
                    </div>
                </div>
                <div style={styles.headerDateBadge}>
                    <span style={{fontSize: '0.7rem', fontWeight: 'bold', opacity: 0.8}}>FECHA REPORTE</span>
                    <span style={{fontSize: '1rem', fontWeight: 'bold'}}>{fecha}</span>
                </div>
            </div>

            <div style={styles.tableContainer}>
                <table style={styles.table}>
                    <thead>
                        <tr>
                            <th style={styles.stickyHeader}>ÁREA</th>
                            <th style={styles.stickyHeaderLeft2}>MÁQUINA</th>
                            {data.headers.map(h => (
                                <th key={h.id} style={styles.th}>{h.tipo_nombre}</th>
                            ))}
                            <th style={styles.thTotal}>TOTAL GENERAL</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.rows.map((row, i) => (
                            <tr key={i} style={row.total > 0 ? styles.rowWithData : styles.rowEmpty}>
                                <td style={styles.tdArea}>{row.area}</td>
                                <td style={styles.tdMachine}>{row.maquina}</td>
                                {data.headers.map(h => {
                                    const val = row.valores[h.id];
                                    return (
                                        <td key={h.id} style={{...styles.tdValue, color: val > 0 ? colors.gray900 : colors.gray300}}>
                                            {val > 0 ? val.toFixed(2) : '-'}
                                        </td>
                                    );
                                })}
                                <td style={styles.tdTotal}>{row.total.toFixed(2)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr style={styles.footerRow}>
                            <td colSpan="2" style={styles.tdFooterLabel}>TOTALES POR MATERIAL</td>
                            {data.headers.map(h => (
                                <td key={h.id} style={styles.tdFooterValue}>
                                    {data.totales[h.id].toFixed(2)}
                                </td>
                            ))}
                            <td style={styles.tdFooterGrandTotal}>{data.granTotal.toFixed(2)}</td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

const styles = {
    wrapper: { 
        marginBottom: spacing.xl, 
        animation: 'fadeIn 0.5s ease-in-out',
        width: '100%'
    },
    reportHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.md,
        backgroundColor: colors.surface,
        borderRadius: radius.md,
        border: `1px solid ${colors.gray200}`,
        borderLeft: `5px solid ${colors.primary}`,
        marginBottom: spacing.md,
        boxShadow: shadows.sm
    },
    headerInfoBlock: {
        display: 'flex',
        flexDirection: 'column',
        gap: '6px'
    },
    infoItem: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '0.9rem'
    },
    infoLabel: {
        fontWeight: '600',
        color: colors.gray600
    },
    infoValue: {
        fontWeight: 'bold',
        color: colors.gray900,
        textTransform: 'uppercase'
    },
    headerDateBadge: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        backgroundColor: colors.primary + '10',
        padding: '8px 15px',
        borderRadius: radius.md,
        color: colors.primary,
        border: `1px solid ${colors.primary}30`
    },
    tableContainer: { 
        overflow: 'auto',
        borderRadius: radius.md, 
        border: `1px solid ${colors.gray200}`,
        boxShadow: shadows.sm,
        maxHeigth: '70vh',
        position:'relative',
        backgroundColor: '#fff'
    },
    table: { 
        width: '100%',
        tableLayout: 'fixed',
        borderCollapse: 'separate', 
        borderSpacing: 0, 
        fontSize: '0.85rem' 
    },
    stickyHeader: { 
        position: 'sticky', 
        top: 0, 
        left: 0, 
        zIndex: 150,
        backgroundColor: '#1F4E79', 
        color: '#fff', 
        padding: '12px', 
        borderBottom: '2px solid #fff',
        borderRight: '1px solid #ffffff33', 
        textAlign: 'left',
        width: '120px'
    },
    stickyHeaderLeft2: { 
        position: 'sticky', 
        top: 0, 
        left: '100px', 
        zIndex: 150,
        backgroundColor: '#1F4E79', 
        color: '#fff', 
        padding: '12px', 
        borderBottom: '2px solid #fff',
        borderRight: '1px solid #ffffff33', 
        textAlign: 'left',
        width: '120px'
    },
    th: { 
        backgroundColor: '#1F4E79', 
        color: '#fff', 
        padding: '12px', 
        textAlign: 'center', 
        position: 'sticky', 
        top: 0, 
        zIndex: 100,
        borderBottom: '2px solid #fff',
        borderRight: '1px solid #ffffff33',
        width: '120px' 
    },
    thTotal: { 
        backgroundColor: '#1F4E79', 
        color: '#fff', 
        padding: '12px', 
        position: 'sticky', 
        top: 0, 
        right: 0, 
        zIndex: 150,
        borderBottom: '2px solid #fff',
        borderLeft: '1px solid #ffffff33', 
        textAlign: 'right',
        width: '120px'
    },
    rowWithData: { 
        backgroundColor: '#fff' 
    },
    rowEmpty: { 
        backgroundColor: colors.gray50, 
        opacity: 0.6 
    },
    tdArea: { 
        padding: '10px', 
        borderBottom: `1px solid ${colors.gray200}`, 
        borderRight: `1px solid ${colors.gray200}`, 
        position: 'sticky', 
        left: 0, 
        backgroundColor: '#fff',
        zIndex: 50,
        color: colors.gray600, 
        minWidth: '100px'
    },
    tdMachine: { 
        padding: '10px', 
        borderBottom: `1px solid ${colors.gray200}`, 
        borderRight: `1px solid ${colors.gray200}`, 
        position: 'sticky',
        left: '100px', 
        backgroundColor: '#fff', 
        zIndex: 50,
        fontWeight: 'bold', 
        minWidth: '150px' 
    },
    tdValue: { 
        padding: '10px', 
        textAlign: 'center', 
        borderBottom: `1px solid ${colors.gray200}`,
        backgroundColor: '#fff', 
        fontFamily: typography.fontMono 
    },
    tdTotal: { 
        padding: '10px', 
        textAlign: 'right', 
        fontWeight: 'bold', 
        backgroundColor: '#F8FAFC', 
        borderBottom: `1px solid ${colors.gray200}`,
        borderLeft: `1px solid ${colors.gray300}`,
        position: 'sticky',
        right: 0, 
        zIndex: 50,
        minWidth: '120px' 
    },
    footerRow: {
        position: 'sticky',
        bottom: 0,
        zIndex:110,
        backgroundColor: '#1F4E79', 
        color: '#fff', 
        fontWeight: 'bold' 
    },
    tdFooterLabel: {
        padding: '15px', 
        textAlign: 'center',
        position: 'sticky',
        left: 0,
        zIndex: 160, 
        textTransform: 'uppercase',
        fontWeight: 'bold',
        borderTop: '2px solid #fff',
        borderRight: '1px solid #ffffff33'
    },
    tdFooterValue: { 
        padding: '15px', 
        textAlign: 'center',
        position: 'sticky',
        bottom: 0,
        backgroundColor: '#1F4E79',
        color: '#fff',
        zIndex: 110,
        borderTop: '2px solid #fff'
    },
    tdFooterGrandTotal: {
        padding: '15px', 
        textAlign: 'right',
        backgroundColor: colors.secondary,
        color: '#fff',
        position: 'sticky',
        bottom: 0,
        right: 0,
        zIndex: 170,
        fontWeight: 'extrabold',
        fontSize: '1rem',
        borderTop: '2px solid #fff',
        borderLeft: '2px solid #fff'
    },
};

export default AdminReportView;