/* src/components/BasculaConnection.js */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../services/api';
import { colors, shadows, radius, spacing, typography, baseComponents } from '../styles/designSystem';

const BasculaConnection = ({ onPesoObtenido, campoDestino = 'peso_cobre', modoInicial = "desconectado" }) => {
    const [estado, setEstado] = useState(modoInicial);
    const [peso, setPeso] = useState(0);
    const [config, setConfig] = useState({ puerto: 'COM3', baudios: 9600, timeout: 2 });
    const [puertos, setPuertos] = useState([]);
    const [modoManual, setModoManual] = useState(false);
    const [mensaje, setMensaje] = useState('');
    const [ultimaLectura, setUltimaLectura] = useState(null);
    const [cargandoPuertos, setCargandoPuertos] = useState(true);

    const intervaloRef = useRef(null);
    const abortControllerRef = useRef(null);
    const estadoRef = useRef(estado);
    const montadoRef = useRef(true);
    const lecturaEnProgresoRef = useRef(false);
    const ultimoPesoEnviadoRef = useRef(null);

    const puertosComunes = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];

    useEffect(() => {
        estadoRef.current = estado;
    }, [estado]);

    // Cargar puertos
    useEffect(() => {
        let cancelado = false;
        const cargarPuertos = async () => {
            setCargandoPuertos(true);
            setMensaje('Iniciando sistema...');
            try {
                const resultado = await apiClient.listarPuertosBascula();
                if (cancelado) return;
                if (resultado.success && resultado.puertos?.length > 0) {
                    setPuertos(resultado.puertos);
                } else {
                    setPuertos(puertosComunes);
                }
                const puertoDefecto = resultado.puerto_recomendado || 'COM3';
                setConfig(prev => ({ ...prev, puerto: puertoDefecto }));
            } catch (error) {
                if (!cancelado) {
                    setPuertos(puertosComunes);
                    setMensaje('Error driver puertos');
                }
            } finally {
                if (!cancelado) setCargandoPuertos(false);
            }
        };
        cargarPuertos();
        return () => { cancelado = true; };
    }, []);

    // Detener lectura
    const detenerLecturaCompleta = useCallback(() => {
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
            abortControllerRef.current = null;
        }
        if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
        }
        lecturaEnProgresoRef.current = false;
    }, []);

    // Desconectar
    const desconectarBascula = useCallback(async () => {
        detenerLecturaCompleta();
        estadoRef.current = 'desconectado';
        lecturaEnProgresoRef.current = false;
        setEstado('desconectando');
        setPeso(0);

        try {
            const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 1500));
            await Promise.race([apiClient.desconectarBascula({ puerto: config.puerto }), timeoutPromise]);
        } catch (e) { console.warn(e); }
        finally {
            if (montadoRef.current) {
                setEstado('desconectado');
                setMensaje('Sistema en espera');
                ultimoPesoEnviadoRef.current = null;
            }
        }
    }, [config.puerto, detenerLecturaCompleta]);

    // Leer Peso
    const leerPesoConCancelacion = useCallback(async () => {
        if (estadoRef.current !== 'conectado' || modoManual || !montadoRef.current || lecturaEnProgresoRef.current) return;

        lecturaEnProgresoRef.current = true;
        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const resultado = await apiClient.leerPesoBascula(config);

            if (controller.signal.aborted || estadoRef.current !== 'conectado') return;

            if (resultado.success && montadoRef.current) {
                const nuevoPeso = parseFloat(resultado.peso_kg) || 0;
                setPeso(nuevoPeso);
                setUltimaLectura(new Date());
                setMensaje(nuevoPeso > 0 ? 'Lectura estable' : 'Báscula en cero');

                if (onPesoObtenido && nuevoPeso > 0) {
                    const diff = Math.abs((ultimoPesoEnviadoRef.current || 0) - nuevoPeso);
                    if (diff > 0.0001) {
                        console.log('📤 Enviando peso a componente padre:', { peso: nuevoPeso, campo: campoDestino });
                        onPesoObtenido(nuevoPeso, campoDestino);
                        ultimoPesoEnviadoRef.current = nuevoPeso;
                    }
                }
            }
        } catch (error) {
            if (!error.message.includes('aborted') && estadoRef.current === 'conectado') {
                if (error.message.includes('conexión') || error.message.includes('timeout')) {
                    desconectarBascula();
                    setMensaje('Pérdida de señal');
                }
            }
        } finally {
            lecturaEnProgresoRef.current = false;
            abortControllerRef.current = null;
        }
    }, [config, modoManual, onPesoObtenido, campoDestino, desconectarBascula]);

    // Iniciar Automático
    const iniciarLecturaAutomatica = useCallback(() => {
        detenerLecturaCompleta();
        if (estadoRef.current !== 'conectado' || modoManual) return;
        leerPesoConCancelacion();
        intervaloRef.current = setInterval(() => {
            if (estadoRef.current !== 'conectado' || modoManual) {
                detenerLecturaCompleta();
                return;
            }
            leerPesoConCancelacion();
        }, 1000);
    }, [modoManual, leerPesoConCancelacion, detenerLecturaCompleta]);

    // Conectar
    const conectarBascula = async () => {
        setEstado('conectando');
        setMensaje('Estableciendo enlace...');
        estadoRef.current = 'conectando';
        try {
            const resultado = await apiClient.conectarBascula(config);
            if (!montadoRef.current) return;

            if (resultado.success) {
                setEstado('conectado');
                estadoRef.current = 'conectado';
                const p = parseFloat(resultado.peso_kg) || 0;
                setPeso(p);
                setMensaje('Enlace establecido');
                setTimeout(() => {
                    if (estadoRef.current === 'conectado') iniciarLecturaAutomatica();
                }, 500);
            } else {
                throw new Error(resultado.mensaje);
            }
        } catch (error) {
            if (montadoRef.current) {
                setEstado('error');
                estadoRef.current = 'desconectado';
                setMensaje('Fallo de conexión');
            }
        }
    };

    // Effects
    useEffect(() => {
        if (estado === 'conectado' && !modoManual) iniciarLecturaAutomatica();
        else detenerLecturaCompleta();
        return () => detenerLecturaCompleta();
    }, [estado, modoManual, iniciarLecturaAutomatica, detenerLecturaCompleta]);

    useEffect(() => {
        montadoRef.current = true;
        return () => {
            montadoRef.current = false;
            detenerLecturaCompleta();
            if (estadoRef.current === 'conectado') desconectarBascula();
        };
    }, [detenerLecturaCompleta, desconectarBascula]);

    // Manual Handlers
    const toggleManual = () => {
        if (modoManual) {
            setModoManual(false);
            setPeso(0);
            setMensaje('Modo Automático');
        } else {
            detenerLecturaCompleta();
            estadoRef.current = 'desconectado';
            setEstado('desconectado');
            setModoManual(true);
            setPeso(0);
            setMensaje('Modo Manual Activado');
        }
    };

    const handleManualChange = (e) => {
        const val = parseFloat(e.target.value) || 0;
        setPeso(val);
        if (onPesoObtenido) onPesoObtenido(val, campoDestino);
    };

    return (
        <div style={styles.panel}>
            {/* Cabecera del Instrumento */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={styles.icon}>⚖️</span>
                    <div>
                        <h4 style={styles.headerText}>
                            MÓDULO DE PESAJE
                        </h4>
                        <small style={styles.headerSubtext}>
                            SERIAL INTERFACE RS232
                        </small>
                    </div>
                </div>
                {/* Indicador LED */}
                <div style={{
                    ...styles.statusIndicator,
                    borderColor: estado === 'conectado' ? colors.success :
                        (estado === 'error' ? colors.error : colors.gray300)
                }}>
                    <span style={{
                        ...styles.led,
                        backgroundColor: estado === 'conectado' ? colors.success :
                            (estado === 'error' ? colors.error : colors.gray400),
                        boxShadow: estado === 'conectado' ? `0 0 8px ${colors.success}` : 'none'
                    }} />
                    <span style={styles.statusText}>
                        {estado === 'conectado' ? 'ONLINE' :
                            (estado === 'conectando' ? 'LINKING...' : 'OFFLINE')}
                    </span>
                </div>
            </div>

            {/* Display LCD Industrial */}
            <div style={styles.lcdContainer}>
                <div style={styles.lcdGlass}>
                    <div style={styles.lcdHeader}>
                        <span style={styles.lcdLabel}>PESO NETO (KG)</span>
                        <span style={styles.lcdTime}>
                            {ultimaLectura ? ultimaLectura.toLocaleTimeString() : '--:--:--'}
                        </span>
                    </div>

                    <div style={styles.lcdValue}>
                        {peso.toFixed(3)}
                    </div>

                    <div style={styles.lcdFooter}>
                        <div style={styles.lcdIndicators}>
                            <span style={{ opacity: modoManual ? 1 : 0.2 }}>MAN</span>
                            <span style={{ opacity: !modoManual && estado === 'conectado' ? 1 : 0.2 }}>AUTO</span>
                            <span style={{ opacity: peso === 0 ? 1 : 0.2 }}>ZERO</span>
                            <span style={{ opacity: estado === 'conectado' ? 1 : 0.2 }}>STABLE</span>
                        </div>
                        <div style={styles.systemMessage}>
                            {mensaje.toUpperCase()}
                        </div>
                    </div>
                </div>
            </div>

            {/* Panel de Control */}
            <div style={styles.controls}>
                <div style={styles.controlRow}>
                    <div style={styles.controlGroup}>
                        <label style={styles.controlLabel}>PUERTO COM</label>
                        <select
                            style={styles.select}
                            value={config.puerto}
                            disabled={estado === 'conectado' || estado === 'conectando' || cargandoPuertos}
                            onChange={(e) => setConfig(prev => ({ ...prev, puerto: e.target.value }))}
                        >
                            {cargandoPuertos ? <option>Cargando...</option> :
                                puertos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div style={styles.controlGroup}>
                        <label style={styles.controlLabel}>ACCIÓN</label>
                        {!modoManual && estado !== 'conectado' && (
                            <button
                                onClick={conectarBascula}
                                disabled={estado === 'conectando'}
                                style={{
                                    ...styles.button,
                                    ...styles.primaryButton,
                                    ...(estado === 'conectando' && styles.disabledButton)
                                }}
                            >
                                {estado === 'conectando' ? 'Conectando...' : '🔌 Conectar'}
                            </button>
                        )}

                        {estado === 'conectado' && (
                            <button onClick={desconectarBascula} style={{ ...styles.button, ...styles.destructiveButton }}>
                                🛑 Desconectar
                            </button>
                        )}

                        {modoManual && (
                            <div style={styles.manualInputContainer}>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={peso}
                                    onChange={handleManualChange}
                                    style={styles.input}
                                    placeholder="0.000"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.secondaryActions}>
                    <button onClick={toggleManual} style={styles.linkButton}>
                        {modoManual ? '↩️ Volver a Automático' : '✍️ Ingresar Manualmente'}
                    </button>
                    <span style={styles.targetText}>
                        Campo: {campoDestino}
                    </span>
                </div>
            </div>
        </div>
    );
};

const styles = {
    panel: {
        ...baseComponents.card,
        padding: spacing.lg,
        marginBottom: spacing.lg
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.md,
        paddingBottom: spacing.sm,
        borderBottom: `1px solid ${colors.gray200}`
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm
    },
    headerText: {
        margin: 0,
        fontSize: typography.sizes.base,
        fontWeight: typography.weights.bold,
        color: colors.gray800
    },
    headerSubtext: {
        color: colors.gray500,
        fontSize: typography.sizes.xs,
        letterSpacing: '0.5px'
    },
    icon: {
        fontSize: '1.5rem',
        filter: 'grayscale(20%)'
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: spacing.xs,
        backgroundColor: colors.gray50,
        padding: `${spacing.xs} ${spacing.sm}`,
        borderRadius: radius.full,
        border: `1px solid ${colors.gray300}`,
        transition: 'all 0.3s ease'
    },
    led: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        transition: 'all 0.3s ease'
    },
    statusText: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold,
        color: colors.gray700,
        letterSpacing: '0.5px'
    },
    // LCD STYLES
    lcdContainer: {
        backgroundColor: colors.lcdBase,
        background: colors.lcdGradient,
        padding: spacing.sm,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        boxShadow: `${shadows.inner}, 0 1px 0 rgba(255,255,255,0.5)`,
        border: `1px solid ${colors.gray300}`
    },
    lcdGlass: {
        border: `1px solid rgba(0,0,0,0.1)`,
        borderRadius: radius.sm,
        padding: spacing.md,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        backgroundColor: 'rgba(255,255,255,0.1)'
    },
    lcdHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: spacing.xs
    },
    lcdLabel: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold,
        color: colors.lcdText,
        opacity: 0.8
    },
    lcdTime: {
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontMono,
        color: colors.lcdText
    },
    lcdValue: {
        fontFamily: typography.fontMono,
        fontSize: '3.5rem',
        fontWeight: typography.weights.bold,
        color: colors.lcdText,
        textAlign: 'right',
        lineHeight: '1',
        letterSpacing: '-2px',
        textShadow: '1px 1px 0 rgba(255,255,255,0.2)',
        margin: `${spacing.xs} 0`
    },
    lcdFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: spacing.sm,
        borderTop: `1px solid rgba(0,0,0,0.05)`,
        paddingTop: spacing.xs
    },
    lcdIndicators: {
        display: 'flex',
        gap: spacing.sm,
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold,
        color: colors.lcdText
    },
    systemMessage: {
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontMono,
        color: colors.lcdText,
        fontWeight: typography.weights.semibold
    },
    // CONTROLES CON ESTILO CONSISTENTE
    controls: {
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.md
    },
    controlRow: {
        display: 'flex',
        gap: spacing.md,
        alignItems: 'flex-end'
    },
    controlGroup: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column'
    },
    controlLabel: {
        display: 'block',
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.semibold,
        color: colors.gray600,
        marginBottom: spacing.xs,
        textTransform: 'uppercase',
        letterSpacing: '0.05em'
    },
    // INPUTS Y SELECTS CON ESTILO CONSISTENTE CON OPERADORDASHBOARD
    select: {
        width: '100%',
        padding: `0 ${spacing.sm}`,
        height: '36px',
        borderRadius: radius.md,
        border: `1px solid ${colors.gray300}`,
        fontSize: typography.sizes.sm,
        fontFamily: typography.fontFamily,
        backgroundColor: colors.surface,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box',
        lineHeight: '36px',
        appearance: 'none',
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: `right ${spacing.xs} center`,
        backgroundRepeat: 'no-repeat',
        backgroundSize: '14px 14px',
        paddingRight: '32px',
        ':focus': {
            borderColor: colors.primary,
            boxShadow: `0 0 0 3px ${colors.primaryLight}`
        }
    },
    input: {
        width: '100%',
        padding: `0 ${spacing.sm}`,
        height: '36px',
        borderRadius: radius.md,
        border: `1px solid ${colors.gray300}`,
        fontSize: typography.sizes.sm,
        fontFamily: typography.fontFamily,
        backgroundColor: colors.surface,
        transition: 'all 0.2s ease',
        outline: 'none',
        boxSizing: 'border-box',
        lineHeight: '36px',
        textAlign: 'right',
        fontWeight: typography.weights.bold,
        fontFamily: typography.fontMono,
        border: `2px solid ${colors.warning}`,
        backgroundColor: '#FFFBEB',
        color: '#92400E',
        ':focus': {
            borderColor: colors.primary,
            boxShadow: `0 0 0 3px ${colors.primaryLight}`
        }
    },
    // BOTONES CON ESTILO CONSISTENTE CON OPERADORDASHBOARD
    button: {
        backgroundColor: colors.primary,
        color: '#FFFFFF',
        padding: `${spacing.sm} ${spacing.md}`,
        borderRadius: radius.md,
        border: 'none',
        fontWeight: typography.weights.semibold,
        fontSize: typography.sizes.sm,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: shadows.sm,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: spacing.xs,
        width: '100%',
        height: '36px',
        ':hover': {
            backgroundColor: colors.primaryHover,
            transform: 'translateY(-1px)',
            boxShadow: shadows.md
        },
        ':disabled': {
            backgroundColor: colors.gray400,
            cursor: 'not-allowed',
            transform: 'none'
        }
    },
    primaryButton: {
        backgroundColor: colors.primary,
        ':hover': {
            backgroundColor: colors.primaryHover
        }
    },
    destructiveButton: {
        backgroundColor: colors.error,
        ':hover': {
            backgroundColor: '#DC2626'
        }
    },
    disabledButton: {
        opacity: 0.6,
        cursor: 'not-allowed',
        transform: 'none',
        ':hover': {
            transform: 'none',
            backgroundColor: colors.gray400
        }
    },
    manualInputContainer: {
        height: '36px'
    },
    secondaryActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTop: `1px solid ${colors.gray200}`
    },
    linkButton: {
        background: 'none',
        border: 'none',
        color: colors.gray600,
        fontSize: typography.sizes.sm,
        cursor: 'pointer',
        textDecoration: 'underline',
        padding: spacing.xs,
        borderRadius: radius.sm,
        transition: 'all 0.2s ease',
        ':hover': {
            backgroundColor: colors.gray100,
            color: colors.gray700
        }
    },
    targetText: {
        fontSize: typography.sizes.xs,
        color: colors.gray400
    }
};
export default BasculaConnection;