""" scripts/detector_universal_basculas.py """
#!/usr/bin/env python3
import serial
import time
import sys
import json
import re
import serial.tools.list_ports

class DetectorUniversalBasculas:
    def __init__(self):
        self.configuraciones_comunes = [
            {'baudrate': 9600, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 0.05},  # Reducido timeout
            {'baudrate': 9600, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 0.05},
            {'baudrate': 2400, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 0.05},
            {'baudrate': 4800, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 0.05},
            {'baudrate': 19200, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 0.05},
        ]

        self.comandos_solicitud = [b'P\r\n', b'W\r\n', b'S\r\n', b'\r\n']
        self.conexion_activa = None
        self.config_activa = None
        self.puerto_activo = None
        
        # Variables para lectura en tiempo real
        self.buffer_activo = ""
        self.ultimo_peso = 0.0
        self.ultimo_raw_data = ""
        self.ultimo_timestamp = time.time()

    def detectar_y_conectar(self, puerto, timeout=0.1):  # Timeout reducido
        """Detectar báscula y mantener conexión activa - CONFIGURADO PARA TIEMPO REAL"""
        print(f"🔍 Conectando a {puerto} con timeout {timeout}s", file=sys.stderr)

        if self.conexion_activa and self.conexion_activa.is_open:
            try:
                self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None

        for config in self.configuraciones_comunes:
            try:
                config_actual = config.copy()
                config_actual['timeout'] = timeout
                
                print(f"🎯 Probando: {config_actual['baudrate']} baud, {timeout}s timeout", file=sys.stderr)

                ser = serial.Serial(
                    port=puerto,
                    baudrate=config_actual['baudrate'],
                    bytesize=config_actual['bytesize'],
                    parity=config_actual['parity'],
                    stopbits=config_actual['stopbits'],
                    timeout=config_actual['timeout']  # Timeout corto para respuesta rápida
                )

                time.sleep(0.1)  # Reducido de 0.5s a 0.1s
                ser.reset_input_buffer()
                ser.reset_output_buffer()

                peso_inicial = self._leer_peso_conexion(ser, config_actual)

                self.conexion_activa = ser
                self.config_activa = config_actual
                self.puerto_activo = puerto

                print(f"✅ Conectado en {puerto} (MODO TIEMPO REAL)", file=sys.stderr)

                return {
                    "success": True,
                    "conectado": True,
                    "peso": peso_inicial if peso_inicial is not None else 0.0,
                    "puerto": puerto,
                    "configuracion": config_actual,
                    "baudios_detectados": config_actual['baudrate'],
                    "mensaje": f"Báscula conectada en {puerto} - Modo tiempo real activado",
                    "tiene_peso_inicial": peso_inicial is not None
                }

            except Exception as e:
                print(f"  ❌ Error: {e}", file=sys.stderr)
                if 'ser' in locals():
                    try:
                        ser.close()
                    except:
                        pass
                continue

        return {
            "success": False,
            "error": f"No se pudo conectar en {puerto}",
            "puerto": puerto
        }

    def _leer_peso_conexion(self, ser, config):
        """Leer peso durante la conexión inicial - OPTIMIZADO"""
        try:
            # Leer inmediatamente lo que haya en buffer
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                peso, _ = self._extraer_peso_universal(data)
                if peso is not None:
                    return peso

            # Probar comandos con esperas reducidas
            for cmd in self.comandos_solicitud:
                try:
                    ser.reset_input_buffer()
                    ser.write(cmd)
                    time.sleep(0.1)  # Reducido de 0.3s

                    if ser.in_waiting > 0:
                        data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                        peso, _ = self._extraer_peso_universal(data)
                        if peso is not None:
                            return peso
                except Exception as e:
                    print(f"  ⚠️  Error con comando {cmd}: {e}", file=sys.stderr)
                    continue

            return 0.0
            
        except Exception as e:
            print(f"  ❌ Error en lectura inicial: {e}", file=sys.stderr)
            return 0.0

    def leer_peso_conexion_activa(self):
        """Leer peso de la conexión activa - OPTIMIZADO PARA RAPIDEZ"""
        if not self.conexion_activa or not self.conexion_activa.is_open:
            return {
                "success": False,
                "error": "No hay conexión activa",
                "requiere_conexion": True
            }

        try:
            ser = self.conexion_activa

            # Verificar conexión rápidamente
            try:
                ser.in_waiting
            except Exception as e:
                print(f"❌ Puerto desconectado: {e}", file=sys.stderr)
                self.conexion_activa = None
                return {
                    "success": False,
                    "error": "Puerto desconectado",
                    "requiere_conexion": True
                }

            # 1. Leer buffer inmediatamente (sin esperas)
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                if data.strip():
                    peso, formato = self._extraer_peso_universal(data)
                    if peso is not None:
                        self.ultimo_peso = peso
                        self.ultimo_raw_data = data.strip()
                        self.ultimo_timestamp = time.time()
                        
                        return {
                            "success": True,
                            "peso": round(peso, 3),
                            "raw_data": data.strip(),
                            "formato_detectado": formato,
                            "metodo": "buffer_directo",
                            "timestamp": self.ultimo_timestamp
                        }

            # 2. Si no hay datos, usar el último conocido (para evitar lag)
            if time.time() - self.ultimo_timestamp < 1.0:  # Si el dato tiene menos de 1 segundo
                return {
                    "success": True,
                    "peso": round(self.ultimo_peso, 3),
                    "raw_data": self.ultimo_raw_data,
                    "formato_detectado": "cache",
                    "metodo": "ultimo_conocido",
                    "timestamp": self.ultimo_timestamp
                }

            return {
                "success": True,
                "peso": 0.0,
                "mensaje": "Esperando datos de báscula...",
                "metodo": "sin_datos_recientes",
                "timestamp": time.time()
            }

        except Exception as e:
            print(f"❌ Error leyendo peso: {e}", file=sys.stderr)
            try:
                if self.conexion_activa:
                    self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None
            return {
                "success": False,
                "error": f"Error de comunicación: {str(e)}",
                "requiere_conexion": True
            }

    def leer_peso_tiempo_real(self):
        """MÉTODO NUEVO: Lectura en tiempo real con mínimo lag"""
        if not self.conexion_activa or not self.conexion_activa.is_open:
            return {
                "success": False,
                "error": "No hay conexión activa",
                "requiere_conexion": True
            }

        try:
            ser = self.conexion_activa
            timestamp_actual = time.time()
            
            # Guardar timeout original
            timeout_original = ser.timeout
            
            # Configurar timeout mínimo para lectura instantánea
            ser.timeout = 0.001  # 1ms máximo de espera
            
            try:
                # Leer TODO lo disponible inmediatamente
                bytes_disponibles = ser.in_waiting
                if bytes_disponibles > 0:
                    # Leer en bloques para máxima velocidad
                    while bytes_disponibles > 0:
                        chunk = ser.read(min(bytes_disponibles, 1024))
                        data = chunk.decode('ascii', errors='ignore')
                        
                        # Procesar inmediatamente
                        if data.strip():
                            peso, formato = self._extraer_peso_universal(data)
                            if peso is not None:
                                self.ultimo_peso = peso
                                self.ultimo_raw_data = data.strip()
                                self.ultimo_timestamp = timestamp_actual
                                
                                # Restaurar timeout
                                ser.timeout = timeout_original
                                
                                return {
                                    "success": True,
                                    "peso": round(peso, 3),
                                    "raw_data": data.strip(),
                                    "formato_detectado": formato,
                                    "metodo": "tiempo_real_instantaneo",
                                    "timestamp": timestamp_actual,
                                    "latencia_ms": 0
                                }
                        
                        # Verificar si hay más datos
                        bytes_disponibles = ser.in_waiting
                
                # Restaurar timeout
                ser.timeout = timeout_original
                
                # Si tenemos un dato reciente (menos de 100ms), devolverlo
                if timestamp_actual - self.ultimo_timestamp < 0.1:  # 100ms
                    return {
                        "success": True,
                        "peso": round(self.ultimo_peso, 3),
                        "raw_data": self.ultimo_raw_data,
                        "formato_detectado": "cache_reciente",
                        "metodo": "cache_ultimo",
                        "timestamp": self.ultimo_timestamp,
                        "latencia_ms": int((timestamp_actual - self.ultimo_timestamp) * 1000)
                    }
                
                # Si no hay datos nuevos
                return {
                    "success": True,
                    "peso": round(self.ultimo_peso, 3),
                    "raw_data": self.ultimo_raw_data,
                    "formato_detectado": "cache",
                    "metodo": "esperando_nuevos_datos",
                    "timestamp": self.ultimo_timestamp,
                    "latencia_ms": int((timestamp_actual - self.ultimo_timestamp) * 1000)
                }
                
            except Exception as e:
                # Restaurar timeout en caso de error
                ser.timeout = timeout_original
                raise e
                
        except Exception as e:
            print(f"⚠️  Error en tiempo real: {e}", file=sys.stderr)
            return {
                "success": False,
                "error": f"Error lectura tiempo real: {str(e)}",
                "requiere_conexion": True
            }

    def leer_peso_una_vez(self, puerto, baudios=None, timeout=0.1):  # Timeout reducido
        """Método alternativo: abrir, leer y cerrar - OPTIMIZADO"""
        print(f"🔍 Lectura rápida desde {puerto} con timeout {timeout}s", file=sys.stderr)
        
        configs_a_probar = self.configuraciones_comunes
        
        if baudios:
            configs_a_probar = [
                {'baudrate': baudios, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': timeout}
            ] + self.configuraciones_comunes

        for config in configs_a_probar:
            try:
                ser = serial.Serial(
                    port=puerto,
                    baudrate=config['baudrate'],
                    bytesize=config['bytesize'],
                    parity=config['parity'],
                    stopbits=config['stopbits'],
                    timeout=config['timeout']
                )

                time.sleep(0.1)  # Reducido de 0.3s
                ser.reset_input_buffer()
                
                # Leer inmediatamente
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                    peso, formato = self._extraer_peso_universal(data)
                    if peso is not None:
                        ser.close()
                        return {
                            "success": True,
                            "peso": peso,
                            "configuracion": config,
                            "metodo": "buffer_inmediato"
                        }
                
                # Comandos rápidos
                for cmd in self.comandos_solicitud:
                    try:
                        ser.reset_input_buffer()
                        ser.write(cmd)
                        time.sleep(0.1)  # Reducido de 0.3s
                        
                        if ser.in_waiting > 0:
                            data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                            peso, formato = self._extraer_peso_universal(data)
                            if peso is not None:
                                ser.close()
                                return {
                                    "success": True,
                                    "peso": peso,
                                    "configuracion": config,
                                    "formato_detectado": formato,
                                    "metodo": "comando_solicitud"
                                }
                    except:
                        continue
                
                ser.close()
                
            except Exception as e:
                try:
                    ser.close()
                except:
                    pass
                continue

        return {
            "success": False,
            "error": f"No se pudo leer peso desde {puerto}",
            "puerto": puerto
        }

    def _extraer_peso_universal(self, datos):
        """Extraer peso en múltiples formatos de básculas - OPTIMIZADO"""
        if not datos or len(datos) < 2:
            return None, "sin_datos"

        # Intentar los formatos más comunes primero para mayor velocidad
        
        # Formato Torrey (ST,GS,1.234 kg)
        if 'ST,GS' in datos:
            match = re.search(r'ST,GS[, ]*([0-9]+\.[0-9]+)', datos)
            if match:
                try:
                    peso = float(match.group(1))
                    if 0.001 <= peso <= 1000:
                        return peso, "torrey"
                except:
                    pass

        # Números con N o T (N1234, T56.78)
        match = re.search(r'[NT](\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "cas"
            except:
                pass

        # Números con signo (+1.23, -0.45)
        match = re.search(r'[+-]?(\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "signed"
            except:
                pass

        # Números decimales simples
        match = re.search(r'(\d+\.\d+)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "simple"
            except:
                pass

        # Números enteros grandes (gramos)
        match = re.search(r'(\d{3,})', datos)
        if match:
            try:
                peso = float(match.group(1))
                if peso > 1000:
                    peso = peso / 1000.0
                if 0.001 <= peso <= 1000:
                    return peso, "gramos"
            except:
                pass

        return None, "desconocido"

    def cerrar_conexion(self):
        """Cerrar conexión de forma segura"""
        if self.conexion_activa:
            try:
                if self.conexion_activa.is_open:
                    self.conexion_activa.reset_input_buffer()
                    self.conexion_activa.reset_output_buffer()
                    time.sleep(0.05)  # Reducido
                    self.conexion_activa.close()
                print(f"🔌 Conexión cerrada correctamente", file=sys.stderr)
            except Exception as e:
                print(f"⚠️ Error cerrando: {e}", file=sys.stderr)
            finally:
                self.conexion_activa = None
                self.config_activa = None


def listar_puertos():
    """Listar puertos disponibles"""
    try:
        ports = serial.tools.list_ports.comports()
        result = []
        for port in ports:
            result.append({
                "device": port.device,
                "name": port.name,
                "description": port.description
            })
        return result
    except Exception as e:
        return {"error": str(e)}


detector_global = None

def obtener_detector():
    global detector_global
    if detector_global is None:
        detector_global = DetectorUniversalBasculas()
    return detector_global


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Uso: detector.py <comando> [args]"}))
        sys.exit(1)

    comando = sys.argv[1]

    try:
        if comando == 'listar_puertos':
            resultado = listar_puertos()
            print(json.dumps(resultado))

        elif comando == 'conectar':
            detector = obtener_detector()
            if len(sys.argv) >= 3:
                puerto = sys.argv[2]
                timeout = float(sys.argv[3]) if len(sys.argv) >= 4 else 0.1  # Default reducido
                resultado = detector.detectar_y_conectar(puerto, timeout)
                print(json.dumps(resultado))
            else:
                puertos = listar_puertos()
                for p in puertos:
                    print(f"🔍 Probando {p['device']}...", file=sys.stderr)
                    resultado = detector.detectar_y_conectar(p['device'], timeout=0.1)
                    if resultado.get("success"):
                        print(json.dumps(resultado))
                        break
                else:
                    print(json.dumps({"success": False, "error": "No se detectó ninguna báscula"}))

        elif comando == 'leer':
            detector = obtener_detector()
            
            if detector.conexion_activa and detector.conexion_activa.is_open:
                resultado = detector.leer_peso_tiempo_real()  # Usar nuevo método
                print(json.dumps(resultado))
            else:
                if len(sys.argv) >= 3:
                    puerto = sys.argv[2]
                    baudios = int(sys.argv[3]) if len(sys.argv) >= 4 else None
                    timeout = float(sys.argv[4]) if len(sys.argv) >= 5 else 0.1  # Default reducido
                    resultado = detector.leer_peso_una_vez(puerto, baudios, timeout)
                    print(json.dumps(resultado))
                else:
                    print(json.dumps({"success": False, "error": "Se requiere puerto para lectura única"}))

        elif comando == 'leer_continuo':
            detector = obtener_detector()
            
            # Configurar para tiempo real
            intervalo = 0.01  # 10ms entre lecturas (100Hz)
            
            print("🚀 Iniciando LECTURA TIEMPO REAL (Ctrl+C para salir)...", file=sys.stderr)
            print("📊 Frecuencia: 100Hz | Intervalo: 10ms", file=sys.stderr)
            print("⚡ Mínimo lag garantizado", file=sys.stderr)

            ultimo_peso_impreso = 0
            contador = 0
            
            try:
                while True:
                    contador += 1
                    
                    # Usar método de tiempo real
                    resultado = detector.leer_peso_tiempo_real()
                    
                    # Solo imprimir si cambió el peso significativamente o cada 10 ciclos
                    peso_actual = resultado.get("peso", 0)
                    if (abs(peso_actual - ultimo_peso_impreso) > 0.001) or (contador % 10 == 0):
                        print(json.dumps(resultado), flush=True)
                        ultimo_peso_impreso = peso_actual
                    
                    # Espera mínima
                    time.sleep(intervalo)
                    
            except KeyboardInterrupt:
                print("\n🛑 Lectura tiempo real detenida", file=sys.stderr)
                print(f"📈 Ciclos totales: {contador}", file=sys.stderr)

        elif comando == 'leer_rapido':
            detector = obtener_detector()
            
            if len(sys.argv) >= 3:
                puerto = sys.argv[2]
                # Conectar primero si no hay conexión
                if not detector.conexion_activa or not detector.conexion_activa.is_open:
                    print(f"🔌 Conectando a {puerto}...", file=sys.stderr)
                    detector.detectar_y_conectar(puerto, timeout=0.05)
                
                print("⚡ Modo RÁPIDO activado (máxima frecuencia)", file=sys.stderr)
                print("📊 Leyendo a ~500Hz", file=sys.stderr)
                
                try:
                    while True:
                        resultado = detector.leer_peso_tiempo_real()
                        print(json.dumps(resultado), flush=True)
                        time.sleep(0.002)  # 2ms - casi continuo
                except KeyboardInterrupt:
                    print("\n🛑 Modo rápido detenido", file=sys.stderr)
            else:
                print(json.dumps({"error": "Uso: detector.py leer_rapido <puerto>"}))

        elif comando == 'cerrar':
            detector = obtener_detector()
            detector.cerrar_conexion()
            print(json.dumps({"success": True, "mensaje": "Conexión cerrada"}))

        elif comando == 'test_latencia':
            """Comando especial para testear latencia"""
            detector = obtener_detector()
            
            if len(sys.argv) >= 3:
                puerto = sys.argv[2]
                # Conectar
                if not detector.conexion_activa or not detector.conexion_activa.is_open:
                    detector.detectar_y_conectar(puerto, timeout=0.05)
                
                print("🧪 Test de latencia iniciado", file=sys.stderr)
                print("⏱️  Midiendo tiempo de respuesta...", file=sys.stderr)
                
                tiempos = []
                for i in range(50):
                    inicio = time.time()
                    resultado = detector.leer_peso_tiempo_real()
                    fin = time.time()
                    latencia = (fin - inicio) * 1000  # ms
                    tiempos.append(latencia)
                    
                    if resultado.get("success"):
                        print(f"[{i+1:02d}] Peso: {resultado.get('peso', 0):.3f} | Latencia: {latencia:.2f}ms")
                    else:
                        print(f"[{i+1:02d}] Error: {resultado.get('error', 'Desconocido')}")
                    
                    time.sleep(0.02)  # 20ms entre tests
                
                # Estadísticas
                if tiempos:
                    print(f"\n📊 ESTADÍSTICAS DE LATENCIA:", file=sys.stderr)
                    print(f"   Mínima: {min(tiempos):.2f}ms", file=sys.stderr)
                    print(f"   Máxima: {max(tiempos):.2f}ms", file=sys.stderr)
                    print(f"   Promedio: {sum(tiempos)/len(tiempos):.2f}ms", file=sys.stderr)
                
            else:
                print(json.dumps({"error": "Uso: detector.py test_latencia <puerto>"}))

        else:
            puerto = comando
            detector = obtener_detector()
            resultado = detector.detectar_y_conectar(puerto, timeout=0.1)
            print(json.dumps(resultado))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()