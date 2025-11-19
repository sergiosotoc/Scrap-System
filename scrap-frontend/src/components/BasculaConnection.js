/* src/components/BasculaConnection.js */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiClient } from '../services/api';

const BasculaConnection = ({ onPesoObtenido, campoDestino = 'peso' }) => {
    const [conectado, setConectado] = useState(false);
    const [peso, setPeso] = useState(0);
    const [cargando, setCargando] = useState(false);
    const [cargandoPuertos, setCargandoPuertos] = useState(true);
    const [puertosDisponibles, setPuertosDisponibles] = useState([]);
    const [configuracion, setConfiguracion] = useState({
        puerto: 'COM3',
        baudios: 9600,
        timeout: 2,
    });
    const [error, setError] = useState('');
    const [info, setInfo] = useState('');
    const [formatoDetectado, setFormatoDetectado] = useState('');
    const intervaloRef = useRef(null);
    const [modoManual, setModoManual] = useState(false);
    const [pesoManual, setPesoManual] = useState("");
    const [ultimaLectura, setUltimaLectura] = useState(null);
    const [velocidadLectura, setVelocidadLectura] = useState(1000);
    const [lecturaEnProgreso, setLecturaEnProgreso] = useState(false);
    const [desconectando, setDesconectando] = useState(false);

    const puertosComunes = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9'];

    // ✅ CORREGIDO: useEffect con cleanup adecuado
    useEffect(() => {
        cargarPuertos();
        return () => {
            detenerLecturaAutomatica();
            if (conectado && !desconectando) {
                handleDesconexionRapida();
            }
        };
    }, []);

    // ✅ CORREGIDO: Effect para controlar lectura automática
    useEffect(() => {
        if (conectado && !modoManual && !desconectando) {
            iniciarLecturaAutomatica();
        } else {
            detenerLecturaAutomatica();
        }
        
        return () => detenerLecturaAutomatica();
    }, [conectado, velocidadLectura, modoManual, desconectando]);

    // ✅ CORREGIDO: Effect para notificar cambios de peso - SIN BUCLE
    useEffect(() => {
        if (onPesoObtenido && !desconectando) {
            console.log(`📤 Notificando peso actual: ${peso} kg a campo: ${campoDestino}`);
            onPesoObtenido(peso, campoDestino);
        }
    }, [peso, campoDestino, onPesoObtenido, desconectando]);

    // ✅ CORREGIDO: Función de desconexión rápida para cleanup
    const handleDesconexionRapida = async () => {
        try {
            await apiClient.desconectarBascula({ puerto: configuracion.puerto });
        } catch (error) {
            console.warn('Error en desconexión rápida:', error);
        }
    };

    // ✅ CORREGIDO: cargarPuertos con useCallback
    const cargarPuertos = useCallback(async () => {
        setCargandoPuertos(true);
        setError('');
        setInfo('🔄 Cargando puertos...');

        try {
            const resultado = await apiClient.listarPuertosBascula();

            if (resultado.success) {
                const puertos = resultado.puertos || puertosComunes;
                setPuertosDisponibles(puertos);

                const puertoRecomendado = resultado.puerto_recomendado ||
                    (puertos.includes('COM3') ? 'COM3' : puertos[0]) || 'COM3';

                const configGuardada = await apiClient.getRegistrosConfig().then(res => res.config_bascula).catch(() => null);

                setConfiguracion(prev => ({
                    ...prev,
                    puerto: configGuardada?.puerto || puertoRecomendado,
                    baudios: configGuardada?.baudios || 9600,
                    timeout: configGuardada?.timeout || 2,
                }));
                setInfo(`✅ ${resultado.mensaje}. Puerto recomendado: ${puertoRecomendado}`);
            }
        } catch (error) {
            setError('Error cargando puertos');
            setPuertosDisponibles(puertosComunes);
            setConfiguracion(prev => ({ ...prev, puerto: 'COM3' }));
        } finally {
            setCargandoPuertos(false);
        }
    }, []);

    const conectarBascula = async () => {
        if (!configuracion.puerto) {
            setError('Seleccione un puerto');
            return;
        }

        setCargando(true);
        setError('');
        setDesconectando(false);
        setInfo(`🔌 Testeando ${configuracion.puerto} @ ${configuracion.baudios} baudios...`);

        try {
            const resultado = await apiClient.conectarBascula(configuracion);

            if (resultado.success) {
                setConectado(true);
                setModoManual(false);
                setDesconectando(false);

                const pesoObtenido = parseFloat(resultado.peso_kg) || 0;
                setPeso(pesoObtenido);
                setUltimaLectura(new Date());

                const mensaje = pesoObtenido > 0
                    ? `✅ Conectado - Peso inicial: ${pesoObtenido} kg`
                    : `✅ Conectado - Puerto ${configuracion.puerto} responde, pero el peso es cero.`;

                setInfo(mensaje);
                setFormatoDetectado(`${resultado.formato_detectado || 'desconocido'} @ ${configuracion.baudios} baud`);

            } else {
                setConectado(false);
                setError(resultado.mensaje || 'No se pudo conectar/leer peso. Revise la configuración o el puerto.');
            }
        } catch (error) {
            setError('Error de comunicación: ' + error.message);
            setConectado(false);
        } finally {
            setCargando(false);
        }
    };

    const leerPesoAutomatico = async () => {
        if (!conectado || lecturaEnProgreso || desconectando || modoManual) {
            return;
        }

        setLecturaEnProgreso(true);

        try {
            const resultado = await apiClient.leerPesoBascula(configuracion);

            if (desconectando) {
                console.log('⏹️ Cancelando lectura - desconexión en progreso');
                return;
            }

            if (resultado.success) {
                const nuevoPeso = parseFloat(resultado.peso_kg) || 0;

                if (nuevoPeso !== peso) {
                    setPeso(nuevoPeso);
                    setUltimaLectura(new Date());
                }

                if (resultado.formato_detectado) {
                    setFormatoDetectado(`${resultado.formato_detectado} @ ${configuracion.baudios} baud`);
                }

                if (error) setError('');

            } else {
                if (resultado.mensaje && resultado.mensaje.includes('conexión')) {
                    setError('Problema de conexión - ' + resultado.mensaje);
                }
            }
        } catch (error) {
            console.debug('Error en lectura automática:', error.message);
        } finally {
            setLecturaEnProgreso(false);
        }
    };

    const iniciarLecturaAutomatica = () => {
        if (desconectando) {
            console.log('⏹️ No iniciar lectura - desconexión en progreso');
            return;
        }

        if (intervaloRef.current) {
            clearInterval(intervaloRef.current);
        }
        
        leerPesoAutomatico();
        
        intervaloRef.current = setInterval(() => {
            leerPesoAutomatico();
        }, velocidadLectura);
        
        console.log(`🔁 Iniciando lectura automática cada ${velocidadLectura}ms`);
    };

    const detenerLecturaAutomatica = () => {
        if (intervaloRef.current) {
            console.log('🛑 Deteniendo lectura automática');
            clearInterval(intervaloRef.current);
            intervaloRef.current = null;
        }
    };

    const desconectarBascula = async () => {
        console.log('🔌 Iniciando proceso de desconexión...');
        
        setDesconectando(true);
        detenerLecturaAutomatica();
        
        setConectado(false);
        setPeso(0);
        setError('');
        setInfo('🔌 Desconectando báscula...');
        setFormatoDetectado('');

        try {
            const desconectarPromise = apiClient.desconectarBascula({ puerto: configuracion.puerto });
            
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Timeout en desconexión')), 3000);
            });

            await Promise.race([desconectarPromise, timeoutPromise]);
            
            setInfo('✅ Báscula desconectada');
            setModoManual(false);
            setPesoManual("");

        } catch (error) {
            console.log('⚠️ Error durante desconexión:', error.message);
            setInfo('✅ Báscula desconectada (puede haber errores en el servidor)');
        } finally {
            setDesconectando(false);
            console.log('🔌 Proceso de desconexión completado');
        }
    };

    const handleConfigChange = (e) => {
        const { name, value } = e.target;
        setConfiguracion(prev => ({
            ...prev,
            [name]: name === 'puerto' ? value : parseInt(value)
        }));
    };

    const activarModoManual = () => {
        setModoManual(true);
        setConectado(false);
        setDesconectando(false);
        setInfo('📌 Modo manual activado');
        detenerLecturaAutomatica();
    };

    const handlePesoManualChange = (e) => {
        const valor = e.target.value;
        setPesoManual(valor);

        const pesoNumerico = parseFloat(valor) || 0;
        setPeso(pesoNumerico);
    };

    const cambiarVelocidad = (nuevaVelocidad) => {
        setVelocidadLectura(nuevaVelocidad);
    };

    const formatearTiempo = (fecha) => {
        if (!fecha) return '';
        return fecha.toLocaleTimeString();
    };

    return (
        <div style={styles.container}>
            <h4 style={styles.titulo}>
                ⚖️ Conexión con Báscula Digital
                {modoManual && <span style={styles.manualBadge}>[MANUAL]</span>}
                {conectado && <span style={styles.autoBadge}>[AUTO {velocidadLectura}ms]</span>}
                {desconectando && <span style={styles.disconnectingBadge}>[DESCONECTANDO...]</span>}
            </h4>

            {info && (
                <div style={{
                    ...styles.infoBox,
                    ...(info.includes('⚠️') && styles.warningBox),
                    ...(info.includes('✅') && styles.successBox),
                    ...(info.includes('❌') && styles.errorBox),
                    ...(info.includes('Desconectando') && styles.disconnectingBox)
                }}>
                    {desconectando ? '⏳ ' + info : info}
                </div>
            )}

            {error && (
                <div style={styles.errorBox}>⚠️ {error}</div>
            )}

            {/* Configuración del Puerto */}
            <div style={styles.configSection}>
                <div style={styles.puertoSection}>
                    <label style={styles.label}>Puerto COM:</label>
                    <select
                        name="puerto"
                        value={configuracion.puerto}
                        onChange={handleConfigChange}
                        style={styles.select}
                        disabled={conectado || cargandoPuertos || modoManual || desconectando}
                    >
                        <option value="">{cargandoPuertos ? 'Cargando...' : 'Seleccionar puerto'}</option>
                        {puertosDisponibles.map(puerto => (
                            <option key={puerto} value={puerto}>{puerto}</option>
                        ))}
                    </select>

                    <button
                        onClick={cargarPuertos}
                        disabled={cargandoPuertos || conectado || desconectando}
                        style={styles.refreshButton}
                        title="Actualizar lista"
                    >
                        {cargandoPuertos ? '🔄' : '🔃'}
                    </button>
                </div>

                <div style={styles.configDetails}>
                    <div style={styles.configGroup}>
                        <label style={styles.label}>Baudios:</label>
                        <input
                            type="number"
                            name="baudios"
                            value={configuracion.baudios}
                            onChange={handleConfigChange}
                            style={styles.inputSmall}
                            disabled={conectado || modoManual || desconectando}
                        />
                    </div>
                    <div style={styles.configGroup}>
                        <label style={styles.label}>Timeout (s):</label>
                        <input
                            type="number"
                            name="timeout"
                            value={configuracion.timeout}
                            onChange={handleConfigChange}
                            style={styles.inputSmall}
                            disabled={conectado || modoManual || desconectando}
                        />
                    </div>
                </div>
            </div>

            {!conectado && !modoManual ? (
                <div style={styles.connectionPanel}>
                    <div style={styles.buttonGroup}>
                        <button
                            onClick={conectarBascula}
                            disabled={cargando || !configuracion.puerto || cargandoPuertos || desconectando}
                            style={{
                                ...styles.connectButton,
                                ...((cargando || !configuracion.puerto || desconectando) && styles.disabledButton)
                            }}
                        >
                            {cargando ? '🔌 Conectando...' : '🔌 Testear Conexión'}
                        </button>

                        <button
                            onClick={activarModoManual}
                            disabled={desconectando}
                            style={styles.manualModeButton}
                        >
                            ✍️ Modo Manual
                        </button>
                    </div>
                </div>
            ) : conectado ? (
                <div style={styles.connected}>
                    <div style={styles.pesoDisplay}>
                        <span style={styles.pesoLabel}>PESO ACTUAL:</span>
                        <span style={styles.pesoValue}>{peso.toFixed(3)} kg</span>
                        <div style={styles.infoAdicional}>
                            {formatoDetectado && <div>📡 {formatoDetectado}</div>}
                            {ultimaLectura && <div>🕒 {formatearTiempo(ultimaLectura)}</div>}
                            <div>🔄 Leyendo cada {velocidadLectura / 1000}s</div>
                            <div>🎯 Campo: {campoDestino}</div>
                        </div>
                    </div>

                    <div style={styles.velocidadControl}>
                        <label style={styles.velocidadLabel}>Velocidad:</label>
                        <div style={styles.velocidadButtons}>
                            <button
                                onClick={() => cambiarVelocidad(500)}
                                disabled={desconectando}
                                style={{ ...styles.velocidadBtn, ...(velocidadLectura === 500 && styles.velocidadBtnActive) }}
                            >
                                Rápida (0.5s)
                            </button>
                            <button
                                onClick={() => cambiarVelocidad(1000)}
                                disabled={desconectando}
                                style={{ ...styles.velocidadBtn, ...(velocidadLectura === 1000 && styles.velocidadBtnActive) }}
                            >
                                Normal (1s)
                            </button>
                            <button
                                onClick={() => cambiarVelocidad(2000)}
                                disabled={desconectando}
                                style={{ ...styles.velocidadBtn, ...(velocidadLectura === 2000 && styles.velocidadBtnActive) }}
                            >
                                Lenta (2s)
                            </button>
                        </div>
                    </div>

                    <div style={styles.controlButtons}>
                        <button 
                            onClick={desconectarBascula} 
                            disabled={desconectando}
                            style={{
                                ...styles.disconnectButton,
                                ...(desconectando && styles.disconnectingButton)
                            }}
                        >
                            {desconectando ? '⏳ Desconectando...' : '🔌 Desconectar'}
                        </button>
                    </div>

                    <div style={styles.status}>
                        <span style={styles.statusConnected}>
                            {desconectando ? '🟡 Desconectando...' : '🟢 Conectado a ' + configuracion.puerto}
                        </span>
                        <span style={styles.puertoInfo}>
                            Config: {configuracion.baudios} baud, {configuracion.timeout}s timeout
                        </span>
                    </div>
                </div>
            ) : null}

            {modoManual && (
                <div style={styles.manualSection}>
                    <div style={styles.manualHeader}>
                        <strong>📌 Modo Manual</strong>
                    </div>
                    <div style={styles.manualInputGroup}>
                        <label style={styles.manualLabel}>Peso (kg):</label>
                        <input
                            type="number"
                            step="0.001"
                            min="0"
                            value={pesoManual}
                            onChange={handlePesoManualChange}
                            placeholder="0.000"
                            style={styles.manualInput}
                            disabled={desconectando}
                        />
                        <span style={styles.manualUnit}>kg</span>
                    </div>
                    <div style={styles.manualButtons}>
                        <button
                            onClick={() => {
                                setModoManual(false);
                                setPesoManual("");
                                setInfo('Modo manual desactivado');
                                conectarBascula();
                            }}
                            disabled={desconectando}
                            style={styles.backButton}
                        >
                            ↩️ Volver a Báscula
                        </button>
                    </div>
                    {peso > 0 && (
                        <div style={styles.pesoPreview}>
                            Peso actual en el formulario: <strong>{peso.toFixed(3)} kg</strong>
                            <div>🎯 Campo: {campoDestino}</div>
                        </div>
                    )}
                </div>
            )}

            <div style={styles.helpText}>
                <strong>💡 Arquitectura de Conexión:</strong>
                <ul style={styles.helpList}>
                    <li>El sistema **abre, lee y cierra** la conexión serial en cada lectura (Modo sin estado).</li>
                    <li>La conexión se mantiene activa al cambiar entre materiales.</li>
                    <li>Asegúrate que el puerto, baudios y timeout coincidan con la configuración de tu báscula.</li>
                </ul>
            </div>
        </div>
    );
};

const styles = {
    container: {
        border: '2px solid #007bff',
        borderRadius: '8px',
        padding: '1rem',
        marginBottom: '1rem',
        backgroundColor: '#f8f9fa',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
    },
    titulo: {
        margin: '0 0 1rem 0',
        color: '#333',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        flexWrap: 'wrap'
    },
    manualBadge: {
        fontSize: '0.7rem',
        backgroundColor: '#ffc107',
        color: '#212529',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px'
    },
    autoBadge: {
        fontSize: '0.7rem',
        backgroundColor: '#17a2b8',
        color: 'white',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px'
    },
    disconnectingBadge: {
        fontSize: '0.7rem',
        backgroundColor: '#ffc107',
        color: '#212529',
        padding: '0.2rem 0.5rem',
        borderRadius: '4px'
    },
    infoBox: {
        backgroundColor: '#d1ecf1',
        color: '#0c5460',
        padding: '0.75rem',
        borderRadius: '4px',
        marginBottom: '1rem',
        border: '1px solid #bee5eb'
    },
    warningBox: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7'
    },
    successBox: {
        backgroundColor: '#d1f2eb',
        color: '#0c5460',
        border: '1px solid #a3e4d7'
    },
    errorBox: {
        backgroundColor: '#f8d7da',
        color: '#721c24',
        padding: '0.75rem',
        borderRadius: '4px',
        marginBottom: '1rem',
        border: '1px solid #f5c6cb'
    },
    disconnectingBox: {
        backgroundColor: '#fff3cd',
        color: '#856404',
        border: '1px solid #ffeaa7'
    },
    configSection: {
        marginBottom: '1rem',
        padding: '1rem',
        backgroundColor: '#e9ecef',
        borderRadius: '8px',
        border: '1px solid #ddd'
    },
    puertoSection: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        marginBottom: '0.5rem',
        flexWrap: 'wrap'
    },
    configDetails: {
        display: 'flex',
        gap: '1rem',
        marginTop: '0.5rem',
        flexWrap: 'wrap',
        justifyContent: 'space-between'
    },
    configGroup: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
    },
    label: {
        fontWeight: 'bold',
        color: '#333',
        minWidth: '80px'
    },
    select: {
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        minWidth: '120px',
        backgroundColor: 'white',
        flex: '1'
    },
    inputSmall: {
        padding: '0.5rem',
        border: '1px solid #ddd',
        borderRadius: '4px',
        width: '80px',
        textAlign: 'center'
    },
    refreshButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '0.5rem 0.75rem',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    connectionPanel: {
        textAlign: 'center'
    },
    buttonGroup: {
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap'
    },
    connectButton: {
        backgroundColor: '#28a745',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '4px',
        cursor: 'pointer',
        fontSize: '1rem',
        fontWeight: 'bold',
        flex: '1',
        minWidth: '120px'
    },
    manualModeButton: {
        backgroundColor: '#ffc107',
        color: '#212529',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: '1',
        minWidth: '120px'
    },
    disabledButton: {
        backgroundColor: '#6c757d',
        cursor: 'not-allowed',
        opacity: 0.6
    },
    connected: {
        textAlign: 'center'
    },
    pesoDisplay: {
        marginBottom: '1rem',
        padding: '1.5rem',
        backgroundColor: 'white',
        borderRadius: '8px',
        border: '3px solid #28a745',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
    },
    pesoLabel: {
        display: 'block',
        fontSize: '0.9rem',
        color: '#666',
        marginBottom: '0.5rem',
        fontWeight: 'bold'
    },
    pesoValue: {
        fontSize: '2.5rem',
        fontWeight: 'bold',
        color: '#28a745',
        display: 'block'
    },
    infoAdicional: {
        marginTop: '0.5rem',
        fontSize: '0.8rem',
        color: '#666',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.2rem'
    },
    velocidadControl: {
        marginBottom: '1rem',
        padding: '0.75rem',
        backgroundColor: '#e9ecef',
        borderRadius: '4px'
    },
    velocidadLabel: {
        display: 'block',
        fontSize: '0.85rem',
        fontWeight: 'bold',
        marginBottom: '0.5rem',
        color: '#495057'
    },
    velocidadButtons: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
        gap: '0.5rem'
    },
    velocidadBtn: {
        padding: '0.5rem',
        fontSize: '0.75rem',
        border: '1px solid #6c757d',
        borderRadius: '4px',
        backgroundColor: 'white',
        cursor: 'pointer',
        transition: 'all 0.2s'
    },
    velocidadBtnActive: {
        backgroundColor: '#007bff',
        color: 'white',
        borderColor: '#007bff',
        fontWeight: 'bold'
    },
    controlButtons: {
        display: 'flex',
        gap: '0.5rem',
        justifyContent: 'center',
        marginBottom: '1rem'
    },
    disconnectButton: {
        backgroundColor: '#dc3545',
        color: 'white',
        border: 'none',
        padding: '0.75rem 1.5rem',
        borderRadius: '4px',
        cursor: 'pointer',
        flex: '1',
        minWidth: '120px'
    },
    disconnectingButton: {
        backgroundColor: '#ffc107',
        color: '#212529',
        cursor: 'not-allowed'
    },
    status: {
        margin: '1rem 0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        fontSize: '0.9rem'
    },
    statusConnected: {
        color: '#28a745',
        fontWeight: 'bold'
    },
    puertoInfo: {
        color: '#6c757d'
    },
    manualSection: {
        backgroundColor: '#fff3cd',
        border: '1px solid #ffeaa7',
        borderRadius: '8px',
        padding: '1rem'
    },
    manualHeader: {
        textAlign: 'center',
        marginBottom: '1rem',
        color: '#856404'
    },
    manualInputGroup: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        marginBottom: '1rem',
        flexWrap: 'wrap'
    },
    manualLabel: {
        fontWeight: 'bold',
        color: '#856404'
    },
    manualInput: {
        padding: '0.5rem',
        border: '1px solid #ccc',
        borderRadius: '4px',
        width: '120px',
        textAlign: 'center'
    },
    manualUnit: {
        color: '#856404',
        fontWeight: 'bold'
    },
    manualButtons: {
        textAlign: 'center',
        marginBottom: '1rem'
    },
    backButton: {
        backgroundColor: '#6c757d',
        color: 'white',
        border: 'none',
        padding: '0.5rem 1rem',
        borderRadius: '4px',
        cursor: 'pointer'
    },
    pesoPreview: {
        textAlign: 'center',
        padding: '0.5rem',
        backgroundColor: 'white',
        borderRadius: '4px',
        border: '1px solid #28a745',
        color: '#28a745'
    },
    helpText: {
        marginTop: '1rem',
        color: '#6c757d',
        fontSize: '0.8rem',
        textAlign: 'left'
    },
    helpList: {
        margin: '0.5rem 0',
        paddingLeft: '1.5rem',
        lineHeight: '1.6'
    }
};

export default BasculaConnection;