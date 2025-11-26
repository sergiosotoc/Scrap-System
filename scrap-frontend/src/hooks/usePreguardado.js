/* src/hooks/usePreguardado.js */
import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '../services/api';

export const usePreguardado = (areaReal, maquinaReal) => {
    const [preguardado, setPreguardado] = useState(null);
    const [cargando, setCargando] = useState(false);

    const cargarPreguardado = useCallback(async () => {
        if (!areaReal || !maquinaReal) {
            setPreguardado(null);
            return;
        }

        setCargando(true);
        try {
            // ✅ CORREGIDO: Usar POST en lugar de GET si hay problemas
            const response = await apiClient.obtenerPreguardado({
                area_real: areaReal,
                maquina_real: maquinaReal
            });

            console.log('📥 Respuesta preguardado:', response);

            if (response.success && response.existe) {
                setPreguardado(response.preguardado);
            } else {
                setPreguardado(null);
            }
        } catch (error) {
            console.error('Error cargando preguardado:', error);
            // Si hay error 404, simplemente no hay preguardado
            if (error.message.includes('404')) {
                setPreguardado(null);
            }
        } finally {
            setCargando(false);
        }
    }, [areaReal, maquinaReal]);

    const guardarPreguardado = useCallback(async (turno, pesos) => {
        if (!areaReal || !maquinaReal) {
            console.error('❌ No hay área o máquina seleccionada');
            return false;
        }

        try {
            console.log('💾 Guardando preguardado:', { turno, pesos, areaReal, maquinaReal });

            const response = await apiClient.preguardarPesos({
                turno,
                area_real: areaReal,
                maquina_real: maquinaReal,
                pesos
            });

            console.log('✅ Preguardado guardado:', response);

            // Recargar el preguardado después de guardar
            await cargarPreguardado();
            return true;
        } catch (error) {
            console.error('Error guardando preguardado:', error);
            return false;
        }
    }, [areaReal, maquinaReal, cargarPreguardado]);

    const limpiarPreguardado = useCallback(async () => {
        if (!areaReal || !maquinaReal) {
            console.error('❌ No hay área o máquina seleccionada');
            return false;
        }

        try {
            await apiClient.limpiarPreguardado({
                area_real: areaReal,
                maquina_real: maquinaReal
            });

            setPreguardado(null);
            return true;
        } catch (error) {
            console.error('Error limpiando preguardado:', error);
            return false;
        }
    }, [areaReal, maquinaReal]);

    useEffect(() => {
        cargarPreguardado();
    }, [cargarPreguardado]);

    return {
        preguardado,
        cargando,
        cargarPreguardado,
        guardarPreguardado,
        limpiarPreguardado
    };
};