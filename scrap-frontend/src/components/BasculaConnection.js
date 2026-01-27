/* src/components/BasculaConnection.js */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../services/api';
import { colors, radius, spacing, typography, baseComponents } from '../styles/designSystem';
import SmoothButton from './SmoothButton';
import SmoothInput from './SmoothInput';
import SmoothSelect from './SmoothSelect';

const BasculaConnection = ({ onPesoObtenido, campoDestino = 'peso_cobre', modoInicial = "desconectado" }) => {
    const [estado, setEstado] = useState(modoInicial);
    const [peso, setPeso] = useState(0);
    const [tara, setTara] = useState(0);
    const [config, setConfig] = useState({ puerto: 'COM3', baudios: 9600, timeout: 1 });
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

    const campoDestinoRef = useRef(campoDestino);

    // Cálculo seguro del Peso Neto
    const pesoBrutoNum = parseFloat(peso) || 0;
    const pesoNeto = Math.max(0, pesoBrutoNum - (parseFloat(tara) || 0));

    // Determinar si es lectura automática real
    const esLecturaAutomatica = !modoManual && estado === 'conectado';

    const [tickLectura, setTickLectura] = useState(0);

    useEffect(() => {
        campoDestinoRef.current = campoDestino;
    }, [campoDestino]);

    const puertosComunes = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];

    useEffect(() => {
        estadoRef.current = estado;
    }, [estado]);

    // ✅ CORRECCIÓN: Enviar bandera de esAutomatico al padre
    useEffect(() => {
        if (onPesoObtenido) {
            onPesoObtenido(
                pesoNeto,
                campoDestinoRef.current,
                esLecturaAutomatica
            );
        }
    }, [tickLectura]);


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
            }
        }
    }, [config.puerto, detenerLecturaCompleta]);

    const leerPesoConCancelacion = useCallback(async () => {
        if (estadoRef.current !== 'conectado' || modoManual || !montadoRef.current || lecturaEnProgresoRef.current) return;

        lecturaEnProgresoRef.current = true;
        try {
            const controller = new AbortController();
            abortControllerRef.current = controller;
            const resultado = await apiClient.leerPesoBascula(config);

            if (controller.signal.aborted || estadoRef.current !== 'conectado') return;

            if (resultado.success && montadoRef.current) {
                const pesoString = String(resultado.peso_kg).replace(',', '.');
                const nuevoPeso = parseFloat(pesoString) || 0;

                setPeso(nuevoPeso);
                setTickLectura(t => t + 1);
                setUltimaLectura(new Date());
                setMensaje(nuevoPeso > 0 ? 'Lectura estable' : 'Báscula en cero');
            }
        } catch (error) {
            if (!error.message.includes('aborted') && estadoRef.current === 'conectado') {
                if (error.message.includes('conexión') || error.message.includes('timeout')) {
                    setMensaje('Reconectando...');
                }
            }
        } finally {
            lecturaEnProgresoRef.current = false;
            abortControllerRef.current = null;
        }
    }, [config, modoManual]);

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
        }, 200);
    }, [modoManual, leerPesoConCancelacion, detenerLecturaCompleta]);

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
                const p = parseFloat(String(resultado.peso_kg).replace(',', '.')) || 0;
                setPeso(p);
                setMensaje('Enlace establecido');
                setTimeout(() => {
                    if (estadoRef.current === 'conectado') iniciarLecturaAutomatica();
                }, 200);
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
        let valStr = e.target.value;
        setPeso(valStr);
    };

    const handleTaraChange = (e) => {
        setTara(e.target.value);
    };

    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <div style={styles.iconContainer}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 3v19"></path>
                            <path d="M5 10h14"></path>
                            <path d="M5 15a5 5 0 0 0 5 5h4a5 5 0 0 0 5-5"></path>
                        </svg>
                    </div>
                    <div>
                        <h4 style={styles.headerText}>MÓDULO DE PESAJE</h4>
                        <small style={styles.headerSubtext}>SERIAL INTERFACE RS232</small>
                    </div>
                </div>
                <div style={{ ...styles.statusIndicator, borderColor: estado === 'conectado' ? colors.success : (estado === 'error' ? colors.error : colors.gray300) }}>
                    <span style={{ ...styles.led, backgroundColor: estado === 'conectado' ? colors.success : (estado === 'error' ? colors.error : colors.gray400), boxShadow: estado === 'conectado' ? `0 0 8px ${colors.success}` : 'none' }} />
                    <span style={styles.statusText}>{estado === 'conectado' ? 'ONLINE' : (estado === 'conectando' ? 'LINKING...' : 'OFFLINE')}</span>
                </div>
            </div>

            <div style={styles.lcdContainer}>
                <div style={styles.lcdGlass}>
                    <div style={styles.lcdHeader}>
                        <span style={styles.lcdLabel}>PESO NETO (KG)</span>
                        {/* ✅ INDICADOR VISUAL DE MODO */}
                        <span style={{
                            fontSize: '0.65rem',
                            fontWeight: 'bold',
                            padding: '2px 6px',
                            borderRadius: '4px',
                            backgroundColor: modoManual ? colors.warning : (estado === 'conectado' ? colors.success : colors.gray400),
                            color: modoManual ? '#78350f' : '#ffffff',
                            letterSpacing: '0.5px'
                        }}>
                            {modoManual ? 'MANUAL' : (estado === 'conectado' ? 'DIGITAL' : '---')}
                        </span>
                    </div>
                    {/* LCD Principal: Peso Neto Calculado */}
                    <div style={styles.lcdValue}>{pesoNeto.toFixed(3)}</div>

                    <div style={styles.lcdDetailRow}>
                        <span style={styles.lcdDetailItem}>Bruto: {pesoBrutoNum.toFixed(3)}</span>
                        <span style={styles.lcdDetailSeparator}>-</span>
                        <span style={styles.lcdDetailItem}>Tara: {(parseFloat(tara) || 0).toFixed(3)}</span>
                    </div>

                    <div style={styles.lcdFooter}>
                        <div style={styles.lcdIndicators}>
                            <span style={{ opacity: modoManual ? 1 : 0.2 }}>MAN</span>
                            <span style={{ opacity: !modoManual && estado === 'conectado' ? 1 : 0.2 }}>AUTO</span>
                            <span style={{ opacity: pesoNeto === 0 ? 1 : 0.2 }}>ZERO</span>
                            <span style={{ opacity: (parseFloat(tara) || 0) > 0 ? 1 : 0.2 }}>TARA</span>
                        </div>
                        <div style={styles.systemMessage}>{mensaje.toUpperCase()}</div>
                    </div>
                </div>
            </div>

            <div style={styles.controls}>
                <div style={styles.controlRow}>
                    <div style={styles.controlGroup}>
                        <SmoothSelect
                            label="PUERTO COM"
                            value={config.puerto}
                            disabled={estado === 'conectado' || estado === 'conectando' || cargandoPuertos}
                            onChange={(e) => setConfig(prev => ({ ...prev, puerto: e.target.value }))}
                            style={{ height: '36px' }}
                        >
                            {cargandoPuertos ? <option>Cargando...</option> : puertos.map(p => <option key={p} value={p}>{p}</option>)}
                        </SmoothSelect>
                    </div>

                    <div style={styles.controlGroup}>
                        <SmoothInput
                            label="PESO CONTENEDOR (TARA)"
                            type="number"
                            step="0.001"
                            value={tara === 0 || tara === '0' ? '' : tara}
                            onChange={handleTaraChange}
                            placeholder="0.000"
                            style={{ height: '36px', textAlign: 'right', fontWeight: '600' }}
                            rightElement={<span style={{ fontSize: '10px', color: colors.gray500, fontWeight: 'bold' }}>KG</span>}
                        />
                    </div>
                </div>

                <div style={styles.controlGroup}>
                    <label style={styles.controlLabel}>ACCIÓN</label>
                    {!modoManual && estado !== 'conectado' && (
                        <SmoothButton onClick={conectarBascula} disabled={estado === 'conectando'} style={{ width: '100%', backgroundColor: estado === 'conectando' ? colors.gray400 : colors.primary }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                <line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                            {estado === 'conectando' ? 'Conectando...' : 'Conectar'}
                        </SmoothButton>
                    )}
                    {estado === 'conectado' && (
                        <SmoothButton onClick={desconectarBascula} variant="destructive" style={{ width: '100%' }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                                <path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path>
                                <line x1="12" y1="2" x2="12" y2="12"></line>
                            </svg>
                            Desconectar
                        </SmoothButton>
                    )}
                    {modoManual && (
                        <div style={styles.manualInputContainer}>
                            <SmoothInput
                                type="number"
                                step="0.001"
                                value={peso === 0 || peso === '0' ? '' : peso}
                                onChange={handleManualChange}
                                placeholder="INGRESO MANUAL BRUTO"
                                style={{
                                    textAlign: 'right',
                                    fontWeight: 'bold',
                                    fontFamily: typography.fontMono,
                                    border: `2px solid ${colors.warning}`,
                                    backgroundColor: '#FFFBEB',
                                    color: '#92400E',
                                    height: '36px'
                                }}
                            />
                        </div>
                    )}
                </div>

                <div style={styles.secondaryActions}>
                    <SmoothButton onClick={toggleManual} style={styles.linkButton} variant="secondary">
                        {modoManual ? (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                    <polyline points="1 4 1 10 7 10"></polyline>
                                    <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
                                </svg>
                                Volver a Automático
                            </>
                        ) : (
                            <>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Ingresar Manualmente
                            </>
                        )}
                    </SmoothButton>
                    <span style={styles.targetText}>Campo: {campoDestino}</span>
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
    iconContainer: {
        color: colors.gray600,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
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
    lcdContainer: {
        backgroundColor: colors.lcdBase || '#C4D4C4',
        background: colors.lcdGradient || 'linear-gradient(180deg, #C4D4C4 0%, #B0C0B0 100%)',
        padding: spacing.sm,
        borderRadius: radius.md,
        marginBottom: spacing.md,
        boxShadow: `inset 0 2px 4px rgba(0,0,0,0.06), 0 1px 0 rgba(255,255,255,0.5)`,
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
        marginBottom: spacing.xs,
        alignItems: 'center'
    },
    lcdLabel: {
        fontSize: typography.sizes.xs,
        fontWeight: typography.weights.bold,
        color: colors.lcdText || '#1a2e1a',
        opacity: 0.8
    },
    lcdTime: {
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontMono,
        color: colors.lcdText || '#1a2e1a'
    },
    lcdValue: {
        fontFamily: typography.fontMono,
        fontSize: '3.5rem',
        fontWeight: typography.weights.bold,
        color: colors.lcdText || '#1a2e1a',
        textAlign: 'right',
        lineHeight: '1',
        letterSpacing: '-2px',
        textShadow: '1px 1px 0 rgba(255,255,255,0.2)',
        margin: '0'
    },
    lcdDetailRow: {
        display: 'flex',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: spacing.sm,
        fontSize: typography.sizes.xs,
        color: colors.lcdText || '#1a2e1a',
        fontFamily: typography.fontMono,
        opacity: 0.8,
        marginTop: '-4px'
    },
    lcdDetailItem: {
        fontWeight: '600'
    },
    lcdDetailSeparator: {
        opacity: 0.5
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
        color: colors.lcdText || '#1a2e1a'
    },
    systemMessage: {
        fontSize: typography.sizes.xs,
        fontFamily: typography.fontMono,
        color: colors.lcdText || '#1a2e1a',
        fontWeight: typography.weights.semibold
    },
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
    manualInputContainer: {
        height: '36px',
        width: '100%'
    },
    secondaryActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: spacing.sm,
        borderTop: `1px solid ${colors.gray200}`
    },
    linkButton: {
        background: 'transparent',
        border: 'none',
        color: colors.gray600,
        fontSize: typography.sizes.sm,
        padding: spacing.xs,
        display: 'flex',
        alignItems: 'center',
        boxShadow: 'none'
    },
    targetText: {
        fontSize: typography.sizes.xs,
        color: colors.gray400
    }
};

export default BasculaConnection;