/* src/components/AdminRecepcionesView.js */
import React, { useState, useEffect, useMemo } from "react";
import { apiClient } from "../services/api";
import { colors, spacing, radius, shadows } from '../styles/designSystem';
import LoadingSpinner from "./LoadingSpinner";
import SmoothInput from "./SmoothInput";
import ExcelExportButtons from "./ExcelExportButtons";

const AdminRecepcionesView = () => {
    const [recepciones, setRecepciones] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterHU, setFilterHU] = useState('');

    const [reporteFechas, setReporteFechas] = useState({
        inicio: new Date().toISOString().slice(0, 10),
        fin: new Date().toISOString().slice(0, 10)
    });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const data = await apiClient.getRecepcionesScrap();
                setRecepciones(data);
            } catch (error) {
                console.error("Error cargando recepciones:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filtrados = useMemo(() => {
        return recepciones.filter(r => {
            const matchesText =
                r.numero_hu.toLowerCase().includes(filterHU.toLowerCase()) ||
                r.tipo_material.toLowerCase().includes(filterHU.toLowerCase())

            if (!r.fecha_entrada)
                return false;

            const fechaRegistro = r.fecha_entrada.split(' ')[0];
            const matchesDate = fechaRegistro >= reporteFechas.inicio &&
                fechaRegistro <= reporteFechas.fin;

            return matchesText && matchesDate;
        }
        );
    }, [recepciones, filterHU, reporteFechas]);

    if (loading)
        return <LoadingSpinner message="Cargando historial de recepciones..." />;

    return (
        <div style={{ animation: 'fadeIn 0.5s ease' }}>
            <div style={localStyles.toolbar}>
                <div style={{
                    display: 'flex',
                    gap: spacing.md,
                    alignItems: 'flex-end'
                }}>
                    <div style={localStyles.filterGroup}>
                        <label style={localStyles.label}>
                            Buscar HU / Material
                        </label>
                        <SmoothInput
                            placeholder="Ej: 260324001..."
                            value={filterHU}
                            onChange={(e) => setFilterHU(e.target.value)}
                            style={{
                                widht: '250px',
                                height: '38px'
                            }}
                        />
                    </div>

                    <div style={localStyles.filterGroup}>
                        <label style={localStyles.label}>
                            Rango para Excel (Inicio - Fin)
                        </label>
                        <div style={{
                            display: 'flex',
                            gap: '5px'
                        }}>
                            <SmoothInput
                                type="date"
                                value={reporteFechas.inicio}
                                onChange={(e) => setReporteFechas({ ...reporteFechas, inicio: e.target.value })}
                                style={{
                                    height: '38px'
                                }}
                            />
                            <SmoothInput
                                type="date"
                                value={reporteFechas.fin}
                                onChange={(e) => setReporteFechas({ ...reporteFechas, fin: e.target.value })}
                                style={{
                                    height: '38px'
                                }}
                            />
                        </div>
                    </div>

                    <ExcelExportButtons
                        tipo="recepciones"
                        filters={{
                            fechaInicio: reporteFechas.inicio,
                            fechaFin: reporteFechas.fin
                        }}
                        buttonText={filtrados.length > 0 ? "Descargar Reporte" : "Sin datos"}
                        buttonStyle={{
                            height: '38px',
                            padding: '0 20px',
                            borderRadius: radius.md,
                            fontSize: '0.85rem',
                            backgroundColor: filtrados.length ? colors.success : colors.gray400,
                            cursor: filtrados.length ? 'pointer' : 'not-allowed',
                            opacity: filtrados.length ? 1 : 0.6
                        }}
                        disabled={filtrados.length === 0}
                    />
                </div>
            </div>

            <div style={localStyles.tableWrapper}>
                <table style={localStyles.table}>
                    <thead>
                        <tr>
                            <th style={localStyles.th}>HU</th>
                            <th style={localStyles.th}>Fecha</th>
                            <th style={localStyles.th}>Tipo Material</th>
                            <th style={localStyles.th}>Peso (kg)</th>
                            <th style={localStyles.th}>Origen</th>
                            <th style={localStyles.th}>Destino</th>
                            <th style={localStyles.th}>Operador</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filtrados.length > 0 ? filtrados.map(r => (
                            <tr key={r.id} style={localStyles.tr}>
                                <td style={localStyles.td}>
                                    <span style={localStyles.huBadge}>
                                        {r.numero_hu}
                                    </span>
                                </td>
                                <td style={localStyles.td}>
                                    {r.fecha_entrada ? (
                                        (() => {
                                            const dateFixed = r.fecha_entrada.replace(/\s/, 'T');
                                            const dateObj = new Date(dateFixed);

                                            return isNaN(dateObj.getTime()) ? (
                                                <span style={{ color: colors.grav400 }}>
                                                    Fecha no válida
                                                </span>
                                            ) : (
                                                <>
                                                    <div style={{ fontWeight: '600', color: colors.gray800 }}>
                                                        {dateObj.toLocaleDateString()}
                                                    </div>
                                                    <div style={{ fontSize: '0.75rem', color: colors.gray500 }}>
                                                        {dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </>
                                            );
                                        })()
                                    ) : '---'
                                    }
                                </td>
                                <td style={localStyles.td}>
                                    <strong>
                                        {r.tipo_material}
                                    </strong>
                                </td>
                                <td style={{
                                    ...localStyles.td,
                                    textAling: 'right',
                                    fontWeight: 'bold',
                                    color: colors.primary
                                }}>
                                    {parseFloat(r.peso_kg || 0).toFixed(2)}
                                </td>

                                <td style={localStyles.td}>
                                    {r.origen_especifico || 'INTERNA'}
                                </td>

                                <td style={localStyles.td}>
                                    <span style={{
                                        padding: '2px 8px',
                                        borderRadius: '4px',
                                        fontSize: '0.75',
                                        backgroundColor: colors.gray100,
                                        textTransform: 'uppercase'
                                    }}>
                                        {r.destino}
                                    </span>
                                </td>

                                <td style={localStyles.td}>
                                    {r.receptor?.name || '---'}
                                </td>
                            </tr>
                        )) : (
                            <tr>
                                <td colSpan="7" style={{
                                    padding: '40',
                                    textAling: 'center',
                                    color: colors.gray400
                                }}>
                                    No se encontraron registros en este rango de fechas.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const localStyles = {
    toolbar: {
        marginBottom: spacing.md,
        padding: spacing.md,
        backgroundColor: colors.gray50,
        borderRadius: radius.md,
        border: `1px solid ${colors.gray200}`
    },
    filterGroup: {
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
    },
    label: {
        fontSize: '11px',
        fontWeight: 'bold',
        color: colors.gray500,
        textTransform: 'uppercase'
    },
    tableWrapper: {
        overflowX: 'auto',
        backgroundColor: '#fff',
        borderRadius: radius.md,
        border: `1px solid ${colors.gray200}`,
        boxShadow: shadows.sm
    },
    table: {
        width: '100%',
        borderCollapse: 'collapse',
        fontSize: '0.85rem'
    },
    th: {
        backgroundColor: colors.gray50,
        padding: '12px',
        textAlign: 'left',
        borderBottom: `2px solid ${colors.gray200}`,
        color: colors.gray600,
        fontWeight: '700'
    },
    td: {
        padding: '12px',
        borderBottom: `1px solid ${colors.gray100}`,
        verticalAlign: 'middle'
    },
    tr: {
        transition: 'background 0.2s'
    },
    huBadge: {
        fontFamily: 'monospace',
        backgroundColor: colors.gray100,
        padding: '4px 8px',
        borderRadius: '4px',
        border: `1px solid ${colors.gray300}`,
        fontWeight: '600'
    }
};

export default AdminRecepcionesView;