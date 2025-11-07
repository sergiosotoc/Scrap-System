<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Log;
use Symfony\Component\Process\Process;

class LeerBascula extends Command
{
    protected $signature = 'bascula:leer 
                            {puerto? : Puerto COM a usar (ej: COM1)}
                            {--listar : Listar puertos disponibles}';
    
    protected $description = 'Leer peso desde báscula serial';

    public function handle()
    {
        try {
            if ($this->option('listar')) {
                return $this->listarPuertos();
            }

            return $this->leerPeso();

        } catch (\Exception $e) {
            $this->error("💥 Error: " . $e->getMessage());
            Log::error('Error en comando bascula:leer: ' . $e->getMessage());
            return 1;
        }
    }

    private function listarPuertos()
    {
        $scriptPath = base_path('scripts/bascula_simple.py');
        
        if (!file_exists($scriptPath)) {
            $this->createSimpleScript();
            // Volver a ejecutar después de crear el script
            return $this->listarPuertos();
        }

        $process = new Process(['python', $scriptPath, 'listar_puertos']);
        $process->setTimeout(10);
        $process->run();

        $output = trim($process->getOutput());
        $errorOutput = $process->getErrorOutput();

        if ($process->isSuccessful()) {
            $this->info($output);
        } else {
            $this->error("❌ Error ejecutando script: " . $errorOutput);
            // Fallback
            $this->info(json_encode([
                ['device' => 'COM1', 'name' => 'COM1', 'description' => 'Puerto serial 1'],
                ['device' => 'COM2', 'name' => 'COM2', 'description' => 'Puerto serial 2'],
                ['device' => 'COM3', 'name' => 'COM3', 'description' => 'Puerto serial 3'],
            ]));
        }
        
        return 0;
    }

    private function leerPeso()
    {
        $puerto = $this->argument('puerto') ?? 'COM1';
        $scriptPath = base_path('scripts/bascula_simple.py');
        
        if (!file_exists($scriptPath)) {
            $this->createSimpleScript();
            // Volver a ejecutar después de crear el script
            return $this->leerPeso();
        }

        $this->info("🔌 Conectando a $puerto...");

        // Usar el formato: python script.py leer COM1
        $process = new Process(['python', $scriptPath, 'leer', $puerto]);
        $process->setTimeout(10);
        $process->run();

        $output = trim($process->getOutput());
        $errorOutput = $process->getErrorOutput();
        
        // Mostrar debug info
        if ($errorOutput) {
            $this->info("🔍 Debug: " . $errorOutput);
        }

        if (empty($output)) {
            $this->error("❌ No se recibió respuesta de la báscula");
            return 1;
        }

        $resultado = json_decode($output, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            $this->error("❌ Respuesta JSON inválida: " . $output);
            return 1;
        }
        
        if (isset($resultado['success']) && $resultado['success']) {
            $this->info("✅ Peso leído: " . $resultado['peso'] . ' kg');
            echo $resultado['peso']; // Output para el controlador
            return 0;
        } else {
            $error = $resultado['error'] ?? 'Error desconocido';
            $this->error("❌ Error: $error");
            
            if (isset($resultado['raw_data'])) {
                $this->info("📋 Datos crudos: " . $resultado['raw_data']);
            }
            return 1;
        }
    }

    private function createSimpleScript()
    {
        $scriptContent = '#!/usr/bin/env python3
import serial, time, sys, json, re, serial.tools.list_ports

def listar_puertos():
    """Listar puertos seriales disponibles"""
    try:
        ports = serial.tools.list_ports.comports()
        result = []
        for port in ports:
            result.append({
                "device": port.device,
                "name": port.name,
                "description": port.description,
                "hwid": port.hwid
            })
        return result
    except Exception as e:
        return {"error": str(e)}

def leer_peso(puerto, baudios=9600, timeout=2):
    """Leer peso desde báscula"""
    try:
        print(f"DEBUG: Intentando conectar a {puerto}", file=sys.stderr)
        
        # Conectar
        ser = serial.Serial(
            port=puerto,
            baudrate=baudios,
            bytesize=serial.EIGHTBITS,
            parity=serial.PARITY_NONE,
            stopbits=serial.STOPBITS_ONE,
            timeout=timeout
        )
        
        # Esperar inicialización
        time.sleep(2)
        
        # Limpiar buffer
        ser.reset_input_buffer()
        
        # Leer datos (múltiples intentos)
        peso = None
        raw_data = ""
        
        for intento in range(3):
            data = ser.readline().decode("ascii", errors="ignore").strip()
            raw_data = data
            
            print(f"DEBUG: Intento {intento + 1}, datos crudos: \"{data}\"", file=sys.stderr)
            
            if data:
                # Extraer número
                patterns = [
                    r"[\\s]*([0-9]+\\.?[0-9]*)[\\s]*[kK]?[gG]?",
                    r"[NT]([0-9]+\\.?[0-9]*)",
                    r"([0-9]+\\.?[0-9]*)",
                ]
                
                for pattern in patterns:
                    match = re.search(pattern, data)
                    if match:
                        try:
                            peso = float(match.group(1))
                            print(f"DEBUG: Peso extraído: {peso}", file=sys.stderr)
                            break
                        except ValueError:
                            continue
            
            if peso is not None:
                break
            time.sleep(0.1)
        
        # Cerrar conexión
        ser.close()
        
        if peso is not None:
            return {
                "success": True,
                "peso": peso,
                "raw_data": raw_data,
                "puerto": puerto
            }
        else:
            return {
                "success": False,
                "error": f"No se pudo leer peso. Datos recibidos: \"{raw_data}\"",
                "puerto": puerto,
                "raw_data": raw_data
            }
            
    except Exception as e:
        print(f"DEBUG: Error: {str(e)}", file=sys.stderr)
        return {
            "success": False, 
            "error": str(e), 
            "puerto": puerto
        }

def main():
    if len(sys.argv) < 2:
        # Si no hay argumentos, mostrar ayuda
        print("Uso:")
        print("  python bascula_simple.py listar_puertos")
        print("  python bascula_simple.py leer <puerto>")
        print("  python bascula_simple.py <puerto>  (lee directamente)")
        sys.exit(1)
    
    comando = sys.argv[1]
    
    try:
        if comando == "listar_puertos":
            resultado = listar_puertos()
            print(json.dumps(resultado))
            
        elif comando == "leer":
            if len(sys.argv) < 3:
                print(json.dumps({"success": False, "error": "Se requiere puerto. Ej: COM1"}))
                sys.exit(1)
            
            puerto = sys.argv[2]
            resultado = leer_peso(puerto)
            print(json.dumps(resultado))
            
        else:
            # Si el primer argumento no es un comando reconocido, asumir que es un puerto
            puerto = comando
            resultado = leer_peso(puerto)
            print(json.dumps(resultado))
            
    except Exception as e:
        print(json.dumps({"success": False, "error": f"Error ejecutando comando: {str(e)}"}))

if __name__ == "__main__":
    main()';

        $scriptPath = base_path('scripts/bascula_simple.py');
        file_put_contents($scriptPath, $scriptContent);
        $this->info("✅ Script único creado: $scriptPath");
    }
}