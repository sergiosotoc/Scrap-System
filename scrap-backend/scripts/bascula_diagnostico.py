#!/usr/bin/env python3
"""
Script de diagnóstico para báscula - Versión simple
"""

import serial
import time
import sys
import json
import serial.tools.list_ports

def listar_puertos():
    """Listar puertos seriales disponibles"""
    try:
        ports = serial.tools.list_ports.comports()
        result = []
        for port in ports:
            result.append({
                'device': port.device,
                'name': port.name,
                'description': port.description,
                'hwid': port.hwid
            })
        return result
    except Exception as e:
        return {'error': str(e)}

def probar_conexion(puerto):
    """Probar conexión simple a la báscula"""
    try:
        print(f"DEBUG: Probando conexión simple a {puerto}", file=sys.stderr)
        
        # Configuración más común para básculas
        ser = serial.Serial(
            port=puerto,
            baudrate=9600,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=2
        )
        
        # Esperar inicialización
        time.sleep(1)
        
        # Limpiar buffer
        ser.reset_input_buffer()
        
        # Intentar leer datos
        datos = ""
        for i in range(5):  # 5 intentos
            if ser.in_waiting > 0:
                raw_data = ser.read(ser.in_waiting)
                try:
                    datos = raw_data.decode('ascii', errors='ignore').strip()
                    print(f"DEBUG: Datos recibidos (intento {i+1}): '{datos}'", file=sys.stderr)
                    
                    # Si hay datos, intentar extraer peso
                    if datos:
                        # Buscar números en los datos
                        import re
                        numeros = re.findall(r'[0-9]+\.?[0-9]*', datos)
                        if numeros:
                            for num in numeros:
                                try:
                                    peso = float(num)
                                    # Validar que sea un peso razonable
                                    if 0.001 <= peso <= 1000:
                                        ser.close()
                                        return {
                                            "success": True,
                                            "peso": peso,
                                            "raw_data": datos,
                                            "puerto": puerto,
                                            "configuracion": "9600-8-N-1"
                                        }
                                except ValueError:
                                    continue
                except Exception as e:
                    print(f"DEBUG: Error decodificando datos: {e}", file=sys.stderr)
            
            time.sleep(0.5)
        
        ser.close()
        
        # Si llegamos aquí, no se pudo leer peso válido
        return {
            "success": False,
            "error": f"No se recibieron datos válidos. Datos: '{datos}'",
            "puerto": puerto,
            "raw_data": datos
        }
            
    except Exception as e:
        print(f"DEBUG: Error de conexión: {str(e)}", file=sys.stderr)
        return {
            "success": False, 
            "error": f"No se pudo conectar al puerto {puerto}: {str(e)}", 
            "puerto": puerto
        }

def main():
    if len(sys.argv) < 2:
        print("Uso:")
        print("  python bascula_diagnostico.py listar_puertos")
        print("  python bascula_diagnostico.py conectar <puerto>")
        sys.exit(1)
    
    comando = sys.argv[1]
    
    try:
        if comando == 'listar_puertos':
            resultado = listar_puertos()
            print(json.dumps(resultado))
            
        elif comando == 'conectar':
            if len(sys.argv) < 3:
                print(json.dumps({'success': False, 'error': 'Se requiere puerto. Ej: COM1'}))
                sys.exit(1)
            
            puerto = sys.argv[2]
            resultado = probar_conexion(puerto)
            print(json.dumps(resultado))
            
        else:
            print(json.dumps({'success': False, 'error': f'Comando no reconocido: {comando}'}))
            
    except Exception as e:
        print(json.dumps({'success': False, 'error': f'Error ejecutando comando: {str(e)}'}))

if __name__ == '__main__':
    main()