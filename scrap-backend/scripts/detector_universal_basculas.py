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
        
        self.comandos_solicitud = [b'P\r\n', b'W\r\n', b'S\r\n']
        self.conexion_activa = None
        self.config_activa = None
        self.puerto_activo = None

    def detectar_y_conectar(self, puerto):
        """Detectar báscula y mantener conexión activa"""
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
                
                # Guardar conexión activa
                self.conexion_activa = ser
                self.config_activa = config
                self.puerto_activo = puerto
                
                # Intentar leer peso inicial
                peso_inicial = self._leer_peso_rapido(ser)
                
                print(f"✅ Conectado en {puerto}", file=sys.stderr)
                
                return {
                    "success": True,
                    "conectado": True,
                    "peso": peso_inicial if peso_inicial is not None else 0.0,
                    "puerto": puerto,
                    "configuracion": config,
                    "mensaje": f"Báscula conectada en {puerto}",
                    "tiene_peso_inicial": peso_inicial is not None
                }
                
            except Exception as e:
                print(f"  ❌ Error: {e}", file=sys.stderr)
                if self.conexion_activa:
                    try:
                        self.conexion_activa.close()
                    except:
                        pass
                    self.conexion_activa = None
                continue
        
        return {
            "success": False,
            "error": f"No se pudo conectar en {puerto}",
            "puerto": puerto
        }

    def _leer_peso_rapido(self, ser):
        """Leer peso rápidamente"""
        # 1. Leer buffer directo
        if ser.in_waiting > 0:
            data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
            peso, _ = self._extraer_peso_universal(data)
            if peso is not None:
                return peso
        
        # 2. Probar comandos
        for cmd in self.comandos_solicitud:
            try:
                ser.reset_input_buffer()
                ser.write(cmd)
                time.sleep(0.2)
                
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                    peso, _ = self._extraer_peso_universal(data)
                    if peso is not None:
                        return peso
            except:
                continue
        
        return None

    def leer_peso_conexion_activa(self):
        """Leer peso de conexión ya establecida"""
        if not self.conexion_activa or not self.conexion_activa.is_open:
            return {
                "success": False, 
                "error": "No hay conexión activa",
                "requiere_conexion": True
            }
        
        try:
            ser = self.conexion_activa
            
            # 1. Leer buffer directo primero
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
            
            # 2. Solicitar con comandos
            for cmd in self.comandos_solicitud:
                try:
                    ser.reset_input_buffer()
                    ser.write(cmd)
                    time.sleep(0.15)
                    
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
                except:
                    continue
            
            # 3. Esperar datos automáticos
            time.sleep(0.3)
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
                            "metodo": "automatico"
                        }
            
            # Sin datos pero conexión OK
            return {
                "success": True,
                "peso": 0.0,
                "mensaje": "Sin peso en báscula",
                "metodo": "sin_datos"
            }
            
        except Exception as e:
            print(f"❌ Error leyendo: {e}", file=sys.stderr)
            # Cerrar conexión dañada
            try:
                self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None
            
            return {
                "success": False, 
                "error": str(e),
                "requiere_conexion": True
            }

    def _extraer_peso_universal(self, datos):
        """Extraer peso de cualquier formato"""
        if not datos or len(datos) < 2:
            return None, "sin_datos"
        
        datos_limpios = datos.replace('\r\n', ' ').replace('\n', ' ').strip()
        
        # 1. TORREY: "ST,GS,001.500,kg"
        if 'ST,GS,' in datos:
            match = re.search(r'ST,GS,(\d+\.?\d*),kg', datos)
            if match:
                try:
                    peso = float(match.group(1))
                    if 0.001 <= peso <= 1000:
                        return peso, "torrey"
                except:
                    pass
        
        # 2. CAS: "N001.50" o "T001.50"
        match = re.search(r'[NT](\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "cas"
            except:
                pass
        
        # 3. Con signo: "+001.50"
        match = re.search(r'[+-](\d+\.?\d*)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "signed"
            except:
                pass
        
        # 4. Simple: "12.34"
        match = re.search(r'(\d+\.\d+)', datos)
        if match:
            try:
                peso = float(match.group(1))
                if 0.001 <= peso <= 1000:
                    return peso, "simple"
            except:
                pass
        
        # 5. Entero (gramos)
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

# Instancia global para mantener conexión entre llamadas
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
            if len(sys.argv) < 3:
                print(json.dumps({"error": "Puerto requerido"}))
                sys.exit(1)
            puerto = sys.argv[2]
            detector = obtener_detector()
            resultado = detector.detectar_y_conectar(puerto)
            print(json.dumps(resultado))
        
        elif comando == 'leer':
            detector = obtener_detector()
            resultado = detector.leer_peso_conexion_activa()
            print(json.dumps(resultado))
        
        elif comando == 'cerrar':
            detector = obtener_detector()
            detector.cerrar_conexion()
            print(json.dumps({"success": True, "mensaje": "Conexión cerrada"}))
        
        else:
            # Compatibilidad: asumir puerto
            puerto = comando
            detector = obtener_detector()
            resultado = detector.detectar_y_conectar(puerto)
            print(json.dumps(resultado))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()