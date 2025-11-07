<?php

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

    private function getConexionKey($puerto) {
        return "bascula_conexion_{$puerto}";
    }

    public function listarPuertos(Request $request)
    {
        try {
            Log::info('Solicitando lista de puertos');

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            if (!file_exists($scriptPath)) {
                $this->createUniversalDetectorScript();
            }

            $pythonPath = $this->getPythonPath();
            $process = new Process([$pythonPath, $scriptPath, 'listar_puertos']);
            $process->setTimeout(10);
            $process->run();

            if (!$process->isSuccessful()) {
                Log::warning('Error ejecutando script: ' . $process->getErrorOutput());
                return $this->listarPuertosFallback();
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
                $puertos = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];
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
            $puerto = $request->input('puerto', $this->obtenerPuertoConfigurado());
            Log::info("Conectando báscula en: $puerto");

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            if (!file_exists($scriptPath)) {
                $this->createUniversalDetectorScript();
            }

            $pythonPath = $this->getPythonPath();
            
            $process = new Process([$pythonPath, $scriptPath, 'conectar', $puerto]);
            $process->setTimeout(15);
            $process->run();

            if (!$process->isSuccessful()) {
                throw new \Exception('Error ejecutando script: ' . $process->getErrorOutput());
            }

            $output = trim($process->getOutput());
            $resultado = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception("Respuesta JSON inválida del script");
            }

            if ($resultado['success']) {
                Cache::put($this->getConexionKey($puerto), true, 3600);
                $this->guardarConfiguracionPuerto($puerto);

                $mensaje = $resultado['tiene_peso_inicial'] 
                    ? "Conectado - Peso: {$resultado['peso']} kg"
                    : "Conectado - Esperando peso";

                return response()->json([
                    'success' => true,
                    'peso_kg' => $resultado['peso'],
                    'mensaje' => $mensaje,
                    'puerto' => $puerto,
                    'modo' => 'real',
                    'conectado' => true,
                    'tiene_peso_inicial' => $resultado['tiene_peso_inicial'],
                    'configuracion' => $resultado['configuracion'] ?? null
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'mensaje' => $resultado['error'] ?? 'Error desconocido',
                    'puerto' => $puerto
                ], 400);
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
            $puerto = $request->input('puerto', $this->obtenerPuertoConfigurado());

            if (!Cache::has($this->getConexionKey($puerto))) {
                return response()->json([
                    'success' => false,
                    'mensaje' => 'No hay conexión activa. Conecte la báscula primero.',
                    'requiere_conexion' => true
                ], 400);
            }

            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            $pythonPath = $this->getPythonPath();
            
            // Lectura rápida
            $process = new Process([$pythonPath, $scriptPath, 'leer']);
            $process->setTimeout(3);
            $process->run();

            if (!$process->isSuccessful()) {
                Cache::forget($this->getConexionKey($puerto));
                throw new \Exception('Error de comunicación - Reconecte la báscula');
            }

            $output = trim($process->getOutput());
            $resultado = json_decode($output, true);

            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new \Exception('Respuesta inválida del script');
            }

            if ($resultado['success']) {
                Cache::put($this->getConexionKey($puerto), true, 3600);

                return response()->json([
                    'success' => true,
                    'peso_kg' => $resultado['peso'],
                    'raw_data' => $resultado['raw_data'] ?? null,
                    'timestamp' => now()->toISOString(),
                    'modo' => 'real',
                    'puerto' => $puerto,
                    'formato_detectado' => $resultado['formato_detectado'] ?? 'desconocido',
                    'metodo' => $resultado['metodo'] ?? 'desconocido'
                ]);
            } else {
                if (isset($resultado['requiere_conexion']) && $resultado['requiere_conexion']) {
                    Cache::forget($this->getConexionKey($puerto));
                }
                
                return response()->json([
                    'success' => false,
                    'mensaje' => $resultado['error'] ?? 'Error leyendo peso',
                    'peso_kg' => 0,
                    'requiere_conexion' => $resultado['requiere_conexion'] ?? false
                ], 400);
            }
        } catch (\Exception $e) {
            Log::error('Error leyendo peso: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'mensaje' => $e->getMessage(),
                'peso_kg' => 0
            ], 500);
        }
    }

    public function desconectar(Request $request)
    {
        try {
            $puerto = $request->input('puerto', $this->obtenerPuertoConfigurado());
            
            $scriptPath = base_path('scripts/detector_universal_basculas.py');
            $pythonPath = $this->getPythonPath();
            
            $process = new Process([$pythonPath, $scriptPath, 'cerrar']);
            $process->setTimeout(5);
            $process->run();

            Cache::forget($this->getConexionKey($puerto));

            return response()->json([
                'success' => true,
                'mensaje' => 'Báscula desconectada'
            ]);
        } catch (\Exception $e) {
            Log::error('Error desconectando: ' . $e->getMessage());
            return response()->json([
                'success' => true,
                'mensaje' => 'Conexión cerrada'
            ]);
        }
    }

    public function configurarBascula(Request $request)
    {
        try {
            $validated = $request->validate([
                'puerto' => 'required|string',
                'baudios' => 'required|integer',
                'timeout' => 'required|integer|min:1'
            ]);

            $this->configBascula = array_merge($this->configBascula, $validated);
            $this->guardarConfiguracionPuerto($validated['puerto']);

            return response()->json([
                'success' => true,
                'mensaje' => 'Configuración actualizada',
                'configuracion' => $this->configBascula
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
        $scriptPath = base_path('scripts/detector_universal_basculas.py');
        $scriptExiste = file_exists($scriptPath);

        $diagnostico = [
            'sistema' => $this->esWindows() ? 'Windows' : 'Linux',
            'script_python' => $scriptExiste ? 'Encontrado' : 'No encontrado',
            'puerto_configurado' => $this->obtenerPuertoConfigurado(),
            'configuracion' => $this->configBascula,
            'timestamp' => now()->toISOString()
        ];

        if ($scriptExiste) {
            try {
                $pythonPath = $this->getPythonPath();
                $process = new Process([$pythonPath, '--version']);
                $process->run();
                $diagnostico['python'] = $process->isSuccessful() ? 'Disponible' : 'No disponible';
                if ($process->isSuccessful()) {
                    $diagnostico['python_version'] = trim($process->getOutput());
                }
            } catch (\Exception $e) {
                $diagnostico['python'] = 'Error: ' . $e->getMessage();
            }
        }

        return response()->json($diagnostico);
    }

    // ========== MÉTODOS PRIVADOS ==========

    private function createUniversalDetectorScript()
    {
        // Aquí deberías copiar el contenido del script Python mejorado
        Log::info("Creando script detector universal");
        // Por ahora solo logueamos
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

        return 'python';
    }

    private function listarPuertosFallback($error = null)
    {
        $puertosComunes = ['COM1', 'COM2', 'COM3', 'COM4', 'COM5'];

        return response()->json([
            'success' => true,
            'puertos' => $puertosComunes,
            'sistema' => 'windows',
            'puerto_recomendado' => 'COM3',
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

        foreach (['COM3', 'COM4', 'COM1'] as $preferido) {
            if (in_array($preferido, $puertos)) {
                return $preferido;
            }
        }

        return count($puertos) > 0 ? $puertos[0] : 'COM3';
    }

    private function guardarConfiguracionPuerto($puerto)
    {
        $config = [
            'puerto' => $puerto,
            'baudios' => $this->configBascula['baudios'],
            'timeout' => $this->configBascula['timeout'],
            'ultima_conexion' => now()->toISOString()
        ];

        Storage::put('bascula_config.json', json_encode($config));
    }

    private function obtenerPuertoConfigurado()
    {
        if (Storage::exists('bascula_config.json')) {
            $config = json_decode(Storage::get('bascula_config.json'), true);
            return $config['puerto'] ?? $this->configBascula['puerto'];
        }

        return $this->configBascula['puerto'];
    }

    private function esWindows()
    {
        return strtoupper(substr(PHP_OS, 0, 3)) === 'WIN';
    }
}