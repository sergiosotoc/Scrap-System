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
            {'baudrate': 9600, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 9600, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 2400, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 4800, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 19200, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 1},
        ]

        self.comandos_solicitud = [b'P\r\n', b'W\r\n', b'S\r\n', b'\r\n']
        self.conexion_activa = None
        self.config_activa = None
        self.puerto_activo = None

    def detectar_y_conectar(self, puerto, timeout=1):
        """Detectar báscula y mantener conexión activa"""
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
                    timeout=config_actual['timeout']
                )

                time.sleep(0.5)
                ser.reset_input_buffer()
                ser.reset_output_buffer()

                peso_inicial = self._leer_peso_conexion(ser, config_actual)

                self.conexion_activa = ser
                self.config_activa = config_actual
                self.puerto_activo = puerto

                print(f"✅ Conectado en {puerto}", file=sys.stderr)

                return {
                    "success": True,
                    "conectado": True,
                    "peso": peso_inicial if peso_inicial is not None else 0.0,
                    "puerto": puerto,
                    "configuracion": config_actual,
                    "baudios_detectados": config_actual['baudrate'],
                    "mensaje": f"Báscula conectada en {puerto}",
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
        """Leer peso durante la conexión inicial"""
        try:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                peso, _ = self._extraer_peso_universal(data)
                if peso is not None:
                    return peso

            for cmd in self.comandos_solicitud:
                try:
                    ser.reset_input_buffer()
                    ser.write(cmd)
                    time.sleep(0.1)

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
        """Leer peso de la conexión activa en tiempo real - MEJORADO"""
        if not self.conexion_activa or not self.conexion_activa.is_open:
            return {
                "success": False,
                "error": "No hay conexión activa",
                "requiere_conexion": True
            }

        try:
            ser = self.conexion_activa

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

            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                if data.strip():
                    peso, formato = self._extraer_peso_universal(data)
                    if peso is not None:
                        return {
                            "success": True,
                            "peso": round(peso, 3),
                            "raw_data": data.strip(),
                            "formato_detectado": formato,
                            "metodo": "buffer_directo"
                        }

            for cmd in self.comandos_solicitud:
                try:
                    ser.reset_input_buffer()
                    ser.write(cmd)
                    time.sleep(0.2)
                    
                    start_time = time.time()
                    while time.time() - start_time < 0.5:
                        if ser.in_waiting > 0:
                            data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                            if data.strip():
                                peso, formato = self._extraer_peso_universal(data)
                                if peso is not None:
                                    return {
                                        "success": True,
                                        "peso": round(peso, 3),
                                        "raw_data": data.strip(),
                                        "formato_detectado": formato,
                                        "metodo": "comando"
                                    }
                        time.sleep(0.05)
                except Exception as e:
                    print(f"Error con comando {cmd}: {e}", file=sys.stderr)
                    continue

            return {
                "success": True,
                "peso": 0.0,
                "mensaje": "Báscula conectada - sin datos recientes",
                "metodo": "conexion_activa_sin_datos"
            }

        except Exception as e:
            print(f"❌ Error crítico leyendo peso: {e}", file=sys.stderr)
            try:
                self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None
            return {
                "success": False,
                "error": f"Error de comunicación: {str(e)}",
                "requiere_conexion": True
            }

    def leer_peso_una_vez(self, puerto, baudios=None, timeout=1):
        """Método alternativo: abrir, leer y cerrar"""
        print(f"🔍 Lectura única desde {puerto} con timeout {timeout}s", file=sys.stderr)
        
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

                time.sleep(0.3)
                ser.reset_input_buffer()
                
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
                
                for cmd in self.comandos_solicitud:
                    try:
                        ser.reset_input_buffer()
                        ser.write(cmd)
                        time.sleep(0.3)
                        
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
        """Extraer peso en múltiples formatos de básculas"""
        if not datos or len(datos) < 2:
            return None, "sin_datos"

        datos_limpios = datos.replace('\r\n', ' ').replace('\n', ' ').strip()

        if 'ST,GS' in datos:
            match = re.search(r'ST,GS[, ]*([0-9]+\.[0-9]+)\s*(kg|g)?', datos)
            if match:
                try:
                    peso = float(match.group(1))
                    if 0.001 <= peso <= 1000:
                        return peso, "torrey"
                except:
                    pass

        match = re.search(r'[NT](\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "cas"
            except:
                pass

        match = re.search(r'[+-]?(\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "signed"
            except:
                pass

        match = re.search(r'(\d+\.\d+)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "simple"
            except:
                pass

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
                    time.sleep(0.1)
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
                timeout = int(sys.argv[3]) if len(sys.argv) >= 4 else 1
                resultado = detector.detectar_y_conectar(puerto, timeout)
                print(json.dumps(resultado))
            else:
                puertos = listar_puertos()
                for p in puertos:
                    print(f"🔍 Probando {p['device']}...", file=sys.stderr)
                    resultado = detector.detectar_y_conectar(p['device'])
                    if resultado.get("success"):
                        print(json.dumps(resultado))
                        break
                else:
                    print(json.dumps({"success": False, "error": "No se detectó ninguna báscula"}))

        elif comando == 'leer':
            detector = obtener_detector()
            
            if detector.conexion_activa and detector.conexion_activa.is_open:
                resultado = detector.leer_peso_conexion_activa()
                print(json.dumps(resultado))
            else:
                if len(sys.argv) >= 3:
                    puerto = sys.argv[2]
                    baudios = int(sys.argv[3]) if len(sys.argv) >= 4 else None
                    timeout = int(sys.argv[4]) if len(sys.argv) >= 5 else 1
                    resultado = detector.leer_peso_una_vez(puerto, baudios, timeout)
                    print(json.dumps(resultado))
                else:
                    print(json.dumps({"success": False, "error": "Se requiere puerto para lectura única"}))

        elif comando == 'leer_continuo':
            detector = obtener_detector()
            print("⏱ Iniciando lectura continua de peso (Ctrl+C para salir)...", file=sys.stderr)

            while True:
                resultado = detector.leer_peso_conexion_activa()
                print(json.dumps(resultado), flush=True)
                time.sleep(0.3)

        elif comando == 'cerrar':
            detector = obtener_detector()
            detector.cerrar_conexion()
            print(json.dumps({"success": True, "mensaje": "Conexión cerrada"}))

        else:
            puerto = comando
            detector = obtener_detector()
            resultado = detector.detectar_y_conectar(puerto)
            print(json.dumps(resultado))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()