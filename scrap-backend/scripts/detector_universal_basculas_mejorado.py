#!/usr/bin/env python3
import serial
import time
import sys
import json
import re
import serial.tools.list_ports

class BasculaManager:
    def __init__(self):
        self.conexion_activa = None
        self.config_activa = None
        
    def conectar_persistente(self, puerto):
        """Conectar en modo persistente"""
        configuraciones = [
            {'baudrate': 9600, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 9600, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 2400, 'bytesize': 7, 'parity': 'E', 'stopbits': 1, 'timeout': 1},
            {'baudrate': 4800, 'bytesize': 8, 'parity': 'N', 'stopbits': 1, 'timeout': 1},
        ]
        
        for config in configuraciones:
            try:
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
                
                # Probar lectura inicial
                peso = self._leer_rapido(ser)
                
                self.conexion_activa = ser
                self.config_activa = config
                
                return {
                    "success": True,
                    "peso": peso if peso is not None else 0.0,
                    "configuracion": config,
                    "tiene_peso_inicial": peso is not None
                }
                
            except Exception as e:
                continue
        
        return {"success": False, "error": f"No se pudo conectar a {puerto}"}

    def leer_persistente(self):
        """Leer con conexión persistente"""
        if not self.conexion_activa or not self.conexion_activa.is_open:
            return {"success": False, "error": "Conexión no activa", "requiere_conexion": True}
        
        try:
            ser = self.conexion_activa
            peso, formato, metodo, raw_data = self._leer_con_metodos(ser)
            
            if peso is not None:
                return {
                    "success": True,
                    "peso": peso,
                    "formato_detectado": formato,
                    "metodo": metodo,
                    "raw_data": raw_data
                }
            else:
                return {
                    "success": True,
                    "peso": 0.0,
                    "mensaje": "Sin datos de peso"
                }
                
        except Exception as e:
            try:
                self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None
            return {"success": False, "error": str(e), "requiere_conexion": True}

    def leer_rapido(self, puerto, baudios, timeout):
        """Leer abriendo y cerrando conexión (más confiable para tiempo real)"""
        try:
            ser = serial.Serial(
                port=puerto,
                baudrate=baudios,
                bytesize=serial.EIGHTBITS,
                parity=serial.PARITY_NONE,
                stopbits=serial.STOPBITS_ONE,
                timeout=timeout
            )
            
            time.sleep(0.3)
            ser.reset_input_buffer()
            
            peso, formato, metodo, raw_data = self._leer_con_metodos(ser)
            
            ser.close()
            
            if peso is not None:
                return {
                    "success": True,
                    "peso": peso,
                    "formato_detectado": formato,
                    "metodo": metodo,
                    "raw_data": raw_data
                }
            else:
                return {
                    "success": False,
                    "error": "No se detectó peso válido",
                    "raw_data": raw_data
                }
                
        except Exception as e:
            return {"success": False, "error": f"Error serial: {str(e)}"}

    def _leer_con_metodos(self, ser):
        """Intentar múltiples métodos de lectura"""
        # Método 1: Leer buffer existente
        if ser.in_waiting > 0:
            data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
            peso, formato = self._extraer_peso(data)
            if peso is not None:
                return peso, formato, "buffer_directo", data

        # Método 2: Comandos de solicitud
        comandos = [b'P\r\n', b'W\r\n', b'S\r\n', b'\x05']  # Incluir ENQ
        for cmd in comandos:
            try:
                ser.reset_input_buffer()
                ser.write(cmd)
                time.sleep(0.2)
                
                if ser.in_waiting > 0:
                    data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                    peso, formato = self._extraer_peso(data)
                    if peso is not None:
                        return peso, formato, "comando", data
            except:
                continue

        # Método 3: Esperar datos automáticos
        tiempo_inicio = time.time()
        while time.time() - tiempo_inicio < 1.0:  # Esperar hasta 1 segundo
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                peso, formato = self._extraer_peso(data)
                if peso is not None:
                    return peso, formato, "automatico", data
            time.sleep(0.1)

        return None, "desconocido", "sin_datos", ""

    def _leer_rapido(self, ser):
        """Lectura rápida para conexión inicial"""
        try:
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                peso, _ = self._extraer_peso(data)
                return peso
            
            # Probar un comando rápido
            ser.reset_input_buffer()
            ser.write(b'P\r\n')
            time.sleep(0.1)
            
            if ser.in_waiting > 0:
                data = ser.read(ser.in_waiting).decode('ascii', errors='ignore')
                peso, _ = self._extraer_peso(data)
                return peso
                
        except:
            pass
        return None

    def _extraer_peso(self, datos):
        """Extraer peso de múltiples formatos"""
        if not datos:
            return None, "sin_datos"
            
        # Limpiar datos
        datos_limpios = datos.replace('\r', ' ').replace('\n', ' ').replace('\t', ' ').strip()
        
        # Patrones de básculas comunes
        patrones = [
            (r'ST,GS,(\d+\.?\d*),kg', "torrey"),
            (r'[NT](\d+\.?\d*)', "cas"),
            (r'[+-](\d+\.?\d*)', "signed"),
            (r'(\d+\.\d+)', "simple"),
            (r'(\d{4,})', "gramos"),  # Números largos sin decimal
        ]
        
        for patron, formato in patrones:
            match = re.search(patron, datos_limpios)
            if match:
                try:
                    peso = float(match.group(1))
                    # Convertir gramos a kg si es necesario
                    if formato == "gramos" and peso > 1000:
                        peso = peso / 1000.0
                    if 0.001 <= peso <= 1000:
                        return round(peso, 3), formato
                except:
                    continue
                    
        return None, "desconocido"

    def cerrar_conexion(self):
        """Cerrar conexión persistente"""
        if self.conexion_activa:
            try:
                self.conexion_activa.close()
            except:
                pass
            self.conexion_activa = None

def listar_puertos():
    """Listar puertos disponibles"""
    try:
        ports = serial.tools.list_ports.comports()
        return [{"device": p.device, "description": p.description} for p in ports]
    except Exception as e:
        return {"error": str(e)}

# Instancia global
manager = BasculaManager()

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Comando requerido"}))
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
            resultado = manager.conectar_persistente(puerto)
            print(json.dumps(resultado))
            
        elif comando == 'leer_persistente':
            resultado = manager.leer_persistente()
            print(json.dumps(resultado))
            
        elif comando == 'leer_rapido':
            if len(sys.argv) < 5:
                print(json.dumps({"error": "Argumentos insuficientes"}))
                sys.exit(1)
            puerto, baudios, timeout = sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
            resultado = manager.leer_rapido(puerto, baudios, timeout)
            print(json.dumps(resultado))
            
        elif comando == 'cerrar':
            manager.cerrar_conexion()
            print(json.dumps({"success": True, "mensaje": "Conexión cerrada"}))
            
        else:
            print(json.dumps({"error": f"Comando no reconocido: {comando}"}))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)

if __name__ == '__main__':
    main()