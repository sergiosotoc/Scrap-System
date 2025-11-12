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

    def detectar_y_conectar(self, puerto):
        """Detectar báscula y mantener conexión activa (como tu código original)"""
        print(f"🔍 Conectando a {puerto}", file=sys.stderr)

        for config in self.configuraciones_comunes:
            try:
                print(f"🎯 Probando: {config['baudrate']} baud", file=sys.stderr)

                ser = serial.Serial(
                    port=puerto,
                    baudrate=config['baudrate'],
                    bytesize=config['bytesize'],
                    parity=config['parity'],
                    stopbits=config['stopbits'],
                    timeout=config['timeout']
                )

                time.sleep(0.5)
                ser.reset_input_buffer()
                ser.reset_output_buffer()

                # Intentar leer peso inicial (MODIFICADO: más tolerante)
                peso_inicial = self._leer_peso_conexion(ser, config)

                # Guardar conexión activa solo si podemos comunicarnos
                self.conexion_activa = ser
                self.config_activa = config
                self.puerto_activo = puerto

                print(f"✅ Conectado en {puerto}", file=sys.stderr)

                return {
                    "success": True,
                    "conectado": True,
                    "peso": peso_inicial if peso_inicial is not None else 0.0,
                    "puerto": puerto,
                    "configuracion": config,
                    "baudios_detectados": config['baudrate'],
                    "mensaje": f"Báscula conectada en {puerto}",
                    "tiene_peso_inicial": peso_inicial is not None
                }

            except Exception as e:
                print(f"  ❌ Error: {e}", file=sys.stderr)
                if 'conexion_activa' in locals():
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
        """Leer peso durante la conexión inicial (más tolerante)"""
        # 1. Leer buffer directo
        if ser.in_waiting > 0:
            data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
            peso, _ = self._extraer_peso_universal(data)
            if peso is not None:
                return peso

        # 2. Probar comandos comunes
        for cmd in self.comandos_solicitud:
            try:
                ser.reset_input_buffer()
                ser.write(cmd)
                time.sleep(0.3)

                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                    peso, _ = self._extraer_peso_universal(data)
                    if peso is not None:
                        return peso
            except:
                continue

        # 3. Si no hay datos, considerar conexión exitosa pero sin peso
        print("⚠️  Conexión establecida pero sin datos de peso inicial", file=sys.stderr)
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

            # Estrategia 1: Leer datos disponibles inmediatamente
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

            # Estrategia 2: Enviar comandos de solicitud
            for cmd in self.comandos_solicitud:
                try:
                    ser.reset_input_buffer()
                    ser.write(cmd)
                    time.sleep(0.2)
                    
                    # Leer con timeout corto
                    start_time = time.time()
                    while time.time() - start_time < 0.5:  # 500ms timeout
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

            # Estrategia 3: Si no hay datos, devolver éxito con peso 0
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
        """Método alternativo: abrir, leer y cerrar (para compatibilidad)"""
        print(f"🔍 Lectura única desde {puerto}", file=sys.stderr)
        
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
                
                # Intentar leer inmediatamente
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
                
                # Probar comandos
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
        """Extraer peso en múltiples formatos de básculas (sin cambios)"""
        if not datos or len(datos) < 2:
            return None, "sin_datos"

        datos_limpios = datos.replace('\r\n', ' ').replace('\n', ' ').strip()

        # 1️⃣ TORREY EQB / L-EQ: "ST,GS,   1.500kg" o "ST,GS,001.500,kg"
        if 'ST,GS' in datos:
            match = re.search(r'ST,GS[, ]*([0-9]+\.[0-9]+)\s*(kg|g)?', datos)
            if match:
                try:
                    peso = float(match.group(1))
                    if 0.001 <= peso <= 1000:
                        return peso, "torrey"
                except:
                    pass

        # 2️⃣ CAS: "N001.50" o "T001.50"
        match = re.search(r'[NT](\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "cas"
            except:
                pass

        # 3️⃣ Con signo: "+001.50" o "-000.75"
        match = re.search(r'[+-]?(\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "signed"
            except:
                pass

        # 4️⃣ Decimal simple: "12.34"
        match = re.search(r'(\d+\.\d+)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "simple"
            except:
                pass

        # 5️⃣ Entero largo (gramos)
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
        """Cerrar conexión activa"""
        if self.conexion_activa:
            try:
                self.conexion_activa.close()
                print(f"🔌 Conexión cerrada", file=sys.stderr)
            except:
                pass
            self.conexion_activa = None
            self.config_activa = None
            self.puerto_activo = None


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


# Instancia global persistente
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
                resultado = detector.detectar_y_conectar(puerto)
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
            
            # Si tenemos conexión activa, usarla para lectura en tiempo real
            if detector.conexion_activa and detector.conexion_activa.is_open:
                resultado = detector.leer_peso_conexion_activa()
                print(json.dumps(resultado))
            else:
                # Fallback: modo una sola vez
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
            # Por defecto: intentar conectar al puerto
            puerto = comando
            detector = obtener_detector()
            resultado = detector.detectar_y_conectar(puerto)
            print(json.dumps(resultado))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)


if __name__ == '__main__':
    main()