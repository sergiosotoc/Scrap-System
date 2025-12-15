<?php

/* app/Http/Controllers/BasculaController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Cache;
use Symfony\Component\Process\Process;

class BasculaController extends Controller
{
    private $configBascula = [
        'puerto' => 'COM3',
        'baudios' => 9600,
        'timeout' => 2,
    ];

    private function getConexionKey($puerto)
    {
        return "bascula_conexion_{$puerto}";
    }

    private function obtenerConfiguracion()
    {
        if (Storage::exists('bascula_config.json')) {
            $config = json_decode(Storage::get('bascula_config.json'), true);
            return array_merge($this->configBascula, $config);
        }

        return $this->configBascula;
    }

    private function obtenerPuertoConfigurado()
    {
        return $this->obtenerConfiguracion()['puerto'];
    }

    private function guardarConfiguracionPuerto($puerto, $baudios = null, $timeout = null)
    {
        $currentConfig = $this->obtenerConfiguracion();

        $config = [
            'puerto' => $puerto,
            'baudios' => $baudios ?? $currentConfig['baudios'],
            'timeout' => $timeout ?? $currentConfig['timeout'],
            'ultima_conexion' => now()->toISOString()
        ];

        Storage::put('bascula_config.json', json_encode($config, JSON_PRETTY_PRINT));
        Log::info("💾 Configuración guardada: {$puerto} @ " . $config['baudios'] . " baud, timeout: " . $config['timeout'] . "s");
    }

    public function listarPuertos(Request $request)
    {
        try {
            Log::info('Solicitando lista de puertos');

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            if (!file_exists($scriptPath)) {
                Log::error('Script Python no encontrado');
                return $this->listarPuertosFallback('Script no encontrado');
            }

            $pythonPath = $this->getPythonPath();
            $process = new Process([$pythonPath, $scriptPath, 'listar_puertos']);
            $process->setTimeout(10);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::warning('Error ejecutando script: ' . $process->getErrorOutput());
                return $this->listarPuertosFallback($process->getErrorOutput());
            }

            $output = $process->getOutput();
            $puertosData = json_decode($output, true);

            $puertos = [];
            if (is_array($puertosData)) {
                foreach ($puertosData as $puertoInfo) {
                    if (isset($puertoInfo['device'])) {
                        $puertos[] = $puertoInfo['device'];
                    }
                }
            }

            if (empty($puertos)) {
                $puertos = $this->esWindows()
                    ? ['COM1', 'COM2', 'COM3', 'COM4', 'COM5']
                    : ['/dev/ttyUSB0', '/dev/ttyACM0'];
            }

            return response()->json([
                'success' => true,
                'puertos' => $puertos,
                'sistema' => $this->esWindows() ? 'windows' : 'linux',
                'puerto_recomendado' => $this->obtenerPuertoRecomendado($puertos),
                'mensaje' => count($puertos) . ' puertos encontrados'
            ]);
        } catch (\Exception $e) {
            Log::error('Error listando puertos: ' . $e->getMessage());
            return $this->listarPuertosFallback($e->getMessage());
        }
    }

    public function conectar(Request $request)
    {
        try {
            $currentConfig = $this->obtenerConfiguracion();
            $puerto = $request->input('puerto', $currentConfig['puerto']);
            $timeout = $request->input('timeout', $currentConfig['timeout']);

            $timeout = min(max($timeout, 1), 30);

            Log::info("🔌 Iniciando conexión en: $puerto con timeout: {$timeout}s");

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            if (!file_exists($scriptPath)) {
                throw new \Exception('Script Python no encontrado');
            }

            $pythonPath = $this->getPythonPath();

            $process = new Process([
                $pythonPath,
                $scriptPath,
                'conectar',
                $puerto,
                (string)$timeout
            ]);
            $process->setTimeout($timeout + 10);
            $process->run();

            $output = trim($process->getOutput());
            $errorOutput = trim($process->getErrorOutput());

            if ($errorOutput) {
                Log::info("Python debug: " . $errorOutput);
            }

            if (!$process->isSuccessful()) {
                throw new \Exception('Error ejecutando script: ' . ($errorOutput ?: 'Proceso falló'));
            }

            $resultado = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Respuesta JSON inválida del script: " . $output);
            }

            if ($resultado['success']) {
                $baudiosDetectados = $resultado['baudios_detectados'] ?? $currentConfig['baudios'];
                $this->guardarConfiguracionPuerto($puerto, $baudiosDetectados, $timeout);

                Cache::put($this->getConexionKey($puerto), [
                    'baudios' => $baudiosDetectados,
                    'conectado' => true,
                    'timestamp' => now()
                ], 3600);

                Log::info("✅ Conexión exitosa: {$puerto} @ {$baudiosDetectados} baud - Peso: {$resultado['peso']} kg");

                return response()->json([
                    'success' => true,
                    'peso_kg' => $resultado['peso'],
                    'mensaje' => $resultado['mensaje'] ?? "Conectado - Peso: {$resultado['peso']} kg",
                    'puerto' => $puerto,
                    'modo' => 'real',
                    'conectado' => true,
                    'tiene_peso_inicial' => $resultado['tiene_peso_inicial'] ?? ($resultado['peso'] > 0),
                    'configuracion' => [
                        'baudios' => $baudiosDetectados,
                        'timeout' => $timeout
                    ]
                ]);
            } else {
                Log::warning("❌ Conexión fallida en {$puerto}: " . ($resultado['error'] ?? 'Error desconocido'));
                return response()->json([
                    'success' => false,
                    'mensaje' => $resultado['error'] ?? 'No se pudo conectar',
                    'puerto' => $puerto,
                    'sugerencia' => 'Verifique: 1) Báscula encendida, 2) Cable USB conectado, 3) Puerto correcto',
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error conectando: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'mensaje' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function leerPeso(Request $request)
    {
        try {
            $currentConfig = $this->obtenerConfiguracion();
            $puerto = $request->input('puerto', $currentConfig['puerto']);
            $timeout = $request->input('timeout', $currentConfig['timeout']);

            $timeout = min(max($timeout, 1), 10);

            Log::info("⚖️ Leyendo peso desde: {$puerto} con timeout: {$timeout}s");

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            if (!file_exists($scriptPath)) {
                throw new \Exception('Script Python no encontrado');
            }

            $pythonPath = $this->getPythonPath();

            $process = new Process([
                $pythonPath,
                $scriptPath,
                'leer',
                $puerto,
                (string)$currentConfig['baudios'],
                (string)$timeout
            ]);

            $process->setTimeout($timeout + 5);
            $process->run();

            $output = trim($process->getOutput());
            $errorOutput = trim($process->getErrorOutput());

            if ($errorOutput) {
                Log::debug("Python stderr: " . $errorOutput);
            }

            if (!$process->isSuccessful()) {
                Log::warning("Script Python terminó con error: " . $errorOutput);
            }

            $resultado = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                Log::error("JSON inválido del script: " . $output);
                throw new \Exception("Error en la comunicación con la báscula");
            }

            if ($resultado['success']) {
                $peso = $resultado['peso'] ?? 0;
                Log::debug("✅ Peso leído: {$peso} kg desde {$puerto}");

                return response()->json([
                    'success' => true,
                    'peso_kg' => $peso,
                    'timestamp' => now()->toISOString(),
                    'puerto' => $puerto,
                    'formato_detectado' => $resultado['formato_detectado'] ?? 'desconocido',
                    'metodo' => $resultado['metodo'] ?? 'desconocido',
                    'raw_data' => $resultado['raw_data'] ?? null,
                    'mensaje' => $resultado['mensaje'] ?? "Peso leído: {$peso} kg"
                ]);
            } else {
                Log::warning("❌ Error leyendo peso: " . ($resultado['error'] ?? 'Error desconocido'));

                return response()->json([
                    'success' => false,
                    'mensaje' => $resultado['error'] ?? 'Error leyendo peso',
                    'peso_kg' => 0,
                    'requiere_conexion' => $resultado['requiere_conexion'] ?? false
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Error en leerPeso: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'mensaje' => 'Error de comunicación con la báscula: ' . $e->getMessage(),
                'peso_kg' => 0,
                'error_tecnico' => $e->getMessage()
            ], 200);
        }
    }

    public function desconectar(Request $request)
    {
        try {
            $puerto = $request->input('puerto', $this->obtenerPuertoConfigurado());

            Log::info("🔌 Desconectando báscula en: {$puerto}");

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            $pythonPath = $this->getPythonPath();

            $process = new Process([$pythonPath, $scriptPath, 'cerrar']);
            $process->setTimeout(5);
            $process->run();

            Cache::forget($this->getConexionKey($puerto));

            Log::info("✅ Báscula desconectada: {$puerto}");

            return response()->json([
                'success' => true,
                'mensaje' => 'Báscula desconectada correctamente',
                'puerto' => $puerto
            ]);
        } catch (\Exception $e) {
            Log::error('Error en desconectar: ' . $e->getMessage());
            $puerto = $request->input('puerto', $this->obtenerPuertoConfigurado());
            Cache::forget($this->getConexionKey($puerto));

            return response()->json([
                'success' => true,
                'mensaje' => 'Conexión cerrada en el sistema',
                'puerto' => $puerto
            ]);
        }
    }

    public function configurarBascula(Request $request)
    {
        try {
            $validated = $request->validate([
                'puerto' => 'required|string',
                'baudios' => 'required|integer',
                'timeout' => 'required|integer|min:1|max:30'
            ]);

            $this->guardarConfiguracionPuerto(
                $validated['puerto'],
                $validated['baudios'],
                $validated['timeout']
            );

            return response()->json([
                'success' => true,
                'mensaje' => 'Configuración actualizada',
                'configuracion' => $this->obtenerConfiguracion()
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'mensaje' => 'Error: ' . $e->getMessage()
            ], 500);
        }
    }

    public function diagnostico()
    {
        $config = $this->obtenerConfiguracion();
        $scriptPath = base_path('scripts/detector_universal_basculas.py');
        $scriptExiste = file_exists($scriptPath);

        $diagnostico = [
            'sistema' => $this->esWindows() ? 'Windows' : 'Linux',
            'script_python' => $scriptExiste ? '✅ Encontrado' : '❌ No encontrado',
            'script_path' => $scriptPath,
            'puerto_configurado' => $config['puerto'],
            'configuracion' => $config,
            'timestamp' => now()->toISOString()
        ];

        if ($scriptExiste) {
            try {
                $pythonPath = $this->getPythonPath();
                $diagnostico['python_path'] = $pythonPath;

                $process = new Process([$pythonPath, '--version']);
                $process->run();
                $diagnostico['python'] = $process->isSuccessful() ? '✅ Disponible' : '❌ No disponible';
                if ($process->isSuccessful()) {
                    $diagnostico['python_version'] = trim($process->getOutput());
                }

                $process = new Process([$pythonPath, '-c', 'import serial; print(serial.__version__)']);
                $process->run();
                if ($process->isSuccessful()) {
                    $diagnostico['pyserial'] = '✅ v' . trim($process->getOutput());
                } else {
                    $diagnostico['pyserial'] = '❌ No instalado (pip install pyserial)';
                }
            } catch (\Exception $e) {
                $diagnostico['python'] = 'Error: ' . $e->getMessage();
            }
        }

        return response()->json($diagnostico);
    }

    private function getPythonPath()
    {
        $venvPath = base_path('venv');

        if ($this->esWindows()) {
            $pythonExe = $venvPath . '\Scripts\python.exe';
        } else {
            $pythonExe = $venvPath . '/bin/python';
        }

        if (file_exists($pythonExe)) {
            return $pythonExe;
        }

        return $this->esWindows() ? 'python' : 'python3';
    }

    private function listarPuertosFallback($error = null)
    {
        $puertosComunes = $this->esWindows()
            ? ['COM1', 'COM2', 'COM3', 'COM4', 'COM5']
            : ['/dev/ttyUSB0', '/dev/ttyACM0'];

        return response()->json([
            'success' => true,
            'puertos' => $puertosComunes,
            'sistema' => $this->esWindows() ? 'windows' : 'linux',
            'puerto_recomendado' => $this->obtenerPuertoRecomendado($puertosComunes),
            'mensaje' => 'Usando puertos por defecto',
            'error' => $error
        ]);
    }

    private function obtenerPuertoRecomendado($puertos)
    {
        $configurado = $this->obtenerPuertoConfigurado();
        if (in_array($configurado, $puertos)) {
            return $configurado;
        }

        $preferidos = ['COM3', 'COM4', 'COM1', '/dev/ttyUSB0'];
        foreach ($preferidos as $preferido) {
            if (in_array($preferido, $puertos)) {
                return $preferido;
            }
        }

        return count($puertos) > 0 ? $puertos[0] : 'COM3';
    }

    private function esWindows()
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }
}
