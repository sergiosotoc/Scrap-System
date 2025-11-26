/* src/components/BasculaConnection.js */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../services/api';

const BasculaConnection = ({ onPesoObtenido, campoDestino = 'peso_cobre_estanado', modoInicial = "desconectado" }) => {
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
                    // Reducir el threshold para mayor sensibilidad
                    if (diff > 0.0001) { // Cambiado de 0.001 a 0.0001
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
            estadoRef.current = 'desconectado'; // Forzar desconexión lógica
            setEstado('desconectado'); // UI desconectada
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

    // ==========================================
    // 2. NUEVA INTERFAZ DE USUARIO (UI)
    // ==========================================
    return (
        <div style={styles.panel}>
            {/* Cabecera del Instrumento */}
            <div style={styles.header}>
                <div style={styles.headerTitle}>
                    <span style={styles.icon}>⚖️</span>
                    <div>
                        <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: '700', color: '#374151' }}>MÓDULO DE PESAJE</h4>
                        <small style={{ color: '#6B7280', fontSize: '0.75rem', letterSpacing: '0.5px' }}>
                            SERIAL INTERFACE RS232
                        </small>
                    </div>
                </div>
                {/* Indicador LED */}
                <div style={{
                    ...styles.statusIndicator,
                    borderColor: estado === 'conectado' ? '#10B981' : (estado === 'error' ? '#EF4444' : '#E5E7EB')
                }}>
                    <span style={{
                        ...styles.led,
                        backgroundColor: estado === 'conectado' ? '#10B981' : (estado === 'error' ? '#EF4444' : '#9CA3AF'),
                        boxShadow: estado === 'conectado' ? '0 0 8px #10B981' : 'none'
                    }} />
                    <span style={styles.statusText}>
                        {estado === 'conectado' ? 'ONLINE' : (estado === 'conectando' ? 'LINKING...' : 'OFFLINE')}
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
                    <div style={{ flex: 1 }}>
                        <label style={styles.controlLabel}>PUERTO COM</label>
                        <select
                            style={styles.modernSelect}
                            value={config.puerto}
                            disabled={estado === 'conectado' || estado === 'conectando' || cargandoPuertos}
                            onChange={(e) => setConfig(prev => ({ ...prev, puerto: e.target.value }))}
                        >
                            {cargandoPuertos ? <option>Cargando...</option> :
                                puertos.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div style={{ flex: 1 }}>
                        <label style={styles.controlLabel}>ACCIÓN</label>
                        {!modoManual && estado !== 'conectado' && (
                            <button
                                onClick={conectarBascula}
                                disabled={estado === 'conectando'}
                                style={{ ...styles.btn, ...styles.btnPrimary, ...(estado === 'conectando' && styles.btnDisabled) }}
                            >
                                {estado === 'conectando' ? 'CONECTANDO...' : '🔌 CONECTAR'}
                            </button>
                        )}

                        {estado === 'conectado' && (
                            <button onClick={desconectarBascula} style={{ ...styles.btn, ...styles.btnDestructive }}>
                                🛑 DESCONECTAR
                            </button>
                        )}

                        {modoManual && (
                            <div style={styles.manualInputContainer}>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={peso}
                                    onChange={handleManualChange}
                                    style={styles.manualInput}
                                    placeholder="0.000"
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div style={styles.secondaryActions}>
                    <button onClick={toggleManual} style={styles.btnLink}>
                        {modoManual ? '↩️ Volver a Modo Automático' : '✍️ Ingresar Peso Manualmente'}
                    </button>
                    <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>Target: {campoDestino}</span>
                </div>
            </div>
        </div>
    );
};

const styles = {
    panel: {
        backgroundColor: '#FFFFFF',
        borderRadius: '12px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
        padding: '1.5rem',
        border: '1px solid #E5E7EB',
        marginBottom: '2rem',
        fontFamily: 'Inter, system-ui, sans-serif'
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1.5rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid #F3F4F6'
    },
    headerTitle: {
        display: 'flex',
        alignItems: 'center',
        gap: '12px'
    },
    icon: {
        fontSize: '1.5rem',
        filter: 'grayscale(20%)'
    },
    statusIndicator: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: '#F9FAFB',
        padding: '6px 12px',
        borderRadius: '99px',
        borderWidth: '1px',
        borderStyle: 'solid'
    },
    led: {
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        transition: 'all 0.3s'
    },
    statusText: {
        fontSize: '0.7rem',
        fontWeight: '700',
        color: '#4B5563',
        letterSpacing: '0.5px'
    },
    // LCD STYLES
    lcdContainer: {
        backgroundColor: '#C4D4C4', // Color base verdoso
        backgroundImage: 'linear-gradient(180deg, #C4D4C4 0%, #B0C0B0 100%)',
        padding: '10px',
        borderRadius: '8px',
        marginBottom: '1.5rem',
        boxShadow: 'inset 0 2px 5px rgba(0,0,0,0.15), 0 1px 0 rgba(255,255,255,0.5)'
    },
    lcdGlass: {
        border: '1px solid rgba(0,0,0,0.1)',
        borderRadius: '4px',
        padding: '1rem',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
    },
    lcdHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: '5px'
    },
    lcdLabel: {
        fontSize: '0.65rem',
        fontWeight: 'bold',
        color: '#2F4F2F',
        opacity: 0.8
    },
    lcdTime: {
        fontSize: '0.65rem',
        fontFamily: 'monospace',
        color: '#2F4F2F'
    },
    lcdValue: {
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: '3.5rem',
        fontWeight: '700',
        color: '#1a2e1a',
        textAlign: 'right',
        lineHeight: '1',
        letterSpacing: '-2px',
        textShadow: '1px 1px 0 rgba(255,255,255,0.2)'
    },
    lcdFooter: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginTop: '10px',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        paddingTop: '5px'
    },
    lcdIndicators: {
        display: 'flex',
        gap: '8px',
        fontSize: '0.6rem',
        fontWeight: 'bold',
        color: '#2F4F2F'
    },
    systemMessage: {
        fontSize: '0.7rem',
        fontFamily: 'monospace',
        color: '#2F4F2F',
        fontWeight: '600'
    },
    // CONTROLS
    controls: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem'
    },
    controlRow: {
        display: 'flex',
        gap: '1rem',
        alignItems: 'flex-end'
    },
    controlLabel: {
        display: 'block',
        fontSize: '0.7rem',
        fontWeight: '700',
        color: '#6B7280',
        marginBottom: '0.25rem',
        textTransform: 'uppercase'
    },
    modernSelect: {
        width: '100%',
        padding: '0.6rem',
        borderRadius: '6px',
        border: '1px solid #D1D5DB',
        backgroundColor: '#F9FAFB',
        fontSize: '0.9rem',
        cursor: 'pointer',
        height: '42px' // Altura fija para alinear con botones
    },
    btn: {
        width: '100%',
        height: '42px',
        borderRadius: '6px',
        fontWeight: '600',
        fontSize: '0.9rem',
        cursor: 'pointer',
        border: 'none',
        transition: 'all 0.2s',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
    },
    btnPrimary: {
        backgroundColor: '#2563EB',
        color: 'white', ':hover': { backgroundColor: '#1D4ED8' }
    },
    btnDestructive: {
        backgroundColor: '#DC2626',
        color: 'white'
    },
    btnDisabled: {
        opacity: 0.7,
        cursor: 'not-allowed'
    },
    manualInputContainer: {
        height: '42px'
    },
    manualInput: {
        width: '100%',
        height: '100%',
        padding: '0.5rem',
        border: '2px solid #FBBF24',
        borderRadius: '6px',
        textAlign: 'right',
        fontSize: '1.2rem',
        fontWeight: 'bold',
        boxSizing: 'border-box',
        backgroundColor: '#FFFBEB',
        color: '#92400E'
    },
    secondaryActions: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '0.5rem',
        borderTop: '1px solid #F3F4F6'
    },
    btnLink: {
        background: 'none',
        border: 'none',
        color: '#6B7280',
        fontSize: '0.85rem',
        cursor: 'pointer',
        textDecoration: 'underline'
    }
};

export default BasculaConnection;