<?php
// app/Http/Controllers/RegistrosScrapController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\RegistroScrapDetalle;
use App\Models\ConfigAreaMaquina;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistrosScrapController extends Controller
{
    // Obtener configuración para el formulario dinámico
    public function getConfiguracion()
    {
        $areasMaquinas = ConfigAreaMaquina::orderBy('orden')
            ->get()
            ->groupBy('area_nombre');

        // Obtener materiales activos para el operador
        $tiposScrap = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])
            ->orderBy('orden')
            ->get();

        return response()->json([
            'areas_maquinas' => $areasMaquinas,
            'tipos_scrap' => $tiposScrap,
            'turnos' => [1, 2, 3]
        ]);
    }

    public function store(Request $request)
    {
        Log::info('📥 Datos recibidos en store:', $request->all());

        // Validamos la cabecera
        $validated = $request->validate([
            'turno' => 'required|in:1,2,3',
            'area_real' => 'required|string|max:100',
            'maquina_real' => 'required|string|max:100',
            'conexion_bascula' => 'boolean',
            'observaciones' => 'nullable|string',
            'detalles' => 'required|array',
            'detalles.*.id' => 'required|exists:config_tipos_scrap,id',
            'detalles.*.peso' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();
        try {
            $pesoTotal = 0;
            $detallesParaGuardar = [];

            // Pre-procesar los detalles para sumar total
            foreach ($validated['detalles'] as $detalle) {
                $peso = round(floatval($detalle['peso']), 3);
                if ($peso > 0) {
                    $pesoTotal += $peso;
                    $detallesParaGuardar[] = [
                        'tipo_scrap_id' => $detalle['id'],
                        'peso' => $peso
                    ];
                }
            }

            // 1. Crear la Cabecera
            $registro = RegistrosScrap::create([
                'operador_id' => Auth::id(),
                'turno' => $validated['turno'],
                'area_real' => strtoupper($validated['area_real']),
                'maquina_real' => strtoupper($validated['maquina_real']),
                'peso_total' => $pesoTotal,
                'conexion_bascula' => $validated['conexion_bascula'] ?? false,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_registro' => now()
            ]);

            // 2. Crear los Detalles (Filas)
            foreach ($detallesParaGuardar as $d) {
                RegistroScrapDetalle::create([
                    'registro_id' => $registro->id,
                    'tipo_scrap_id' => $d['tipo_scrap_id'],
                    'peso' => $d['peso']
                ]);
            }

            DB::commit();

            // Cargar relaciones
            $registro->load('operador', 'detalles.tipoScrap');

            return response()->json([
                'success' => true,
                'message' => 'Registro guardado exitosamente',
                'registro' => $registro,
                'peso_total' => $registro->peso_total,
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error creando registro scrap: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error interno al guardar: ' . $e->getMessage()
            ], 500);
        }
    }

    public function storeBatch(Request $request)
    {
        Log::info('📥📥 Datos recibidos en storeBatch - Cantidad: ' . count($request->registros ?? []));

        // Validar estructura del batch
        $validated = $request->validate([
            'registros' => 'required|array|min:1',
            'registros.*.turno' => 'required|in:1,2,3',
            'registros.*.area_real' => 'required|string|max:100',
            'registros.*.maquina_real' => 'required|string|max:100',
            'registros.*.conexion_bascula' => 'boolean',
            'registros.*.observaciones' => 'nullable|string',
            'registros.*.detalles' => 'required|array',
            'registros.*.detalles.*.id' => 'required|exists:config_tipos_scrap,id',
            'registros.*.detalles.*.peso' => 'required|numeric|min:0'
        ]);

        DB::beginTransaction();

        try {
            $registrosCreados = [];
            $totalRegistros = count($validated['registros']);
            $errores = [];

            Log::info("🔄 Procesando batch de {$totalRegistros} registros...");

            foreach ($validated['registros'] as $index => $registroData) {
                try {
                    $pesoTotal = 0;
                    $detallesParaGuardar = [];

                    // Procesar detalles y calcular peso total de este registro específico
                    foreach ($registroData['detalles'] as $detalle) {
                        $peso = round(floatval($detalle['peso']), 3);
                        if ($peso > 0) {
                            $pesoTotal += $peso;
                            $detallesParaGuardar[] = [
                                'tipo_scrap_id' => $detalle['id'],
                                'peso' => $peso
                            ];
                        }
                    }

                    // Si no hay peso en ninguno de los materiales, saltamos la fila
                    if ($pesoTotal <= 0) {
                        continue;
                    }

                    // Crear la cabecera del registro usando las observaciones enviadas desde React
                    $registro = RegistrosScrap::create([
                        'operador_id' => Auth::id(),
                        'turno' => $registroData['turno'],
                        'area_real' => strtoupper($registroData['area_real']),
                        'maquina_real' => strtoupper($registroData['maquina_real']),
                        'peso_total' => $pesoTotal,
                        'conexion_bascula' => $registroData['conexion_bascula'] ?? false,
                        // Aquí se guarda la cadena detallada generada en el Frontend
                        'observaciones' => $registroData['observaciones'] ?? 'Registro masivo automático',
                        'fecha_registro' => now()
                    ]);

                    // Insertar los detalles vinculados a este registro
                    foreach ($detallesParaGuardar as $d) {
                        RegistroScrapDetalle::create([
                            'registro_id' => $registro->id,
                            'tipo_scrap_id' => $d['tipo_scrap_id'],
                            'peso' => $d['peso']
                        ]);
                    }

                    $registrosCreados[] = $registro;
                } catch (\Exception $e) {
                    $errores[] = [
                        'indice' => $index,
                        'error' => $e->getMessage(),
                        'maquina' => $registroData['maquina_real'] ?? 'Desconocida'
                    ];
                    Log::error("❌ Error en registro individual del lote {$index}: " . $e->getMessage());
                }
            }

            if (empty($registrosCreados) && !empty($errores)) {
                DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'No se pudo guardar ningún registro del lote',
                    'errores' => $errores
                ], 500);
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => count($registrosCreados) . " registros procesados correctamente",
                'count_exitosos' => count($registrosCreados),
                'count_fallidos' => count($errores),
                'errores' => count($errores) > 0 ? $errores : null
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error crítico en storeBatch: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error de servidor al procesar el lote: ' . $e->getMessage()
            ], 500);
        }
    }

    public function index(Request $request)
    {
        $user = Auth::user();

        // Eager loading de 'detalles' y 'detalles.tipoScrap' para eficiencia
        $query = RegistrosScrap::with(['operador', 'detalles.tipoScrap']);

        if ($request->has('area') && $request->area != '') {
            $query->where('area_real', $request->area);
        }

        if ($request->has('turno') && $request->turno != '') {
            $query->where('turno', $request->turno);
        }

        if ($request->has('fecha') && $request->fecha != '') {
            $query->whereDate('fecha_registro', $request->fecha);
        }

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->orderBy('fecha_registro', 'desc')
            ->get()
            ->map(function ($registro) {
                // Transformamos la estructura para que sea fácil de leer en el Frontend
                $data = $registro->toArray();

                // Agregamos un array simple de materiales para mostrar en tabla
                $data['materiales_resumen'] = $registro->detalles->map(function ($d) {
                    return [
                        'nombre' => $d->tipoScrap->tipo_nombre ?? 'Desconocido',
                        'peso' => $d->peso
                    ];
                });

                return $data;
            });

        return response()->json($registros);
    }

    public function getRegistros(Request $request)
    {
        $user = Auth::user();

        $query = RegistrosScrap::with(['operador', 'detalles.tipoScrap']);

        // Filtros básicos
        if ($request->has('area') && $request->area != '') {
            $query->where('area_real', $request->area);
        }

        if ($request->has('turno') && $request->turno != '') {
            $query->where('turno', $request->turno);
        }

        if ($request->has('fecha') && $request . fecha != '') {
            $query->whereDate('fecha_registro', $request->fecha);
        }

        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('fecha_registro', [
                $request->fecha_inicio,
                $request->fecha_fin
            ]);
        }

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->orderBy('fecha_registro', 'desc')
            ->get()
            ->map(function ($registro) {
                $data = $registro->toArray();

                // Crear un objeto pesos_detalle dinámico
                $pesosDetalle = [];
                foreach ($registro->detalles as $detalle) {
                    if ($detalle->tipoScrap) {
                        $columna = $detalle->tipoScrap->columna_db;
                        $pesosDetalle[$columna] = $detalle->peso;
                    }
                }

                $data['pesos_detalle'] = $pesosDetalle;

                return $data;
            });

        return response()->json($registros);
    }

    public function getRegistroScrapStats()
    {
        $user = Auth::user();

        $query = RegistrosScrap::query();

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        // Estadísticas básicas
        $totalRegistros = $query->count();
        $pesoTotal = $query->sum('peso_total');

        // Conteo por método
        $basculaCount = RegistrosScrap::where('conexion_bascula', true)->count();
        $manualCount = $totalRegistros - $basculaCount;

        // Conteo por turno
        $turno1Count = RegistrosScrap::where('turno', 1)->count();
        $turno2Count = RegistrosScrap::where('turno', 2)->count();
        $turno3Count = RegistrosScrap::where('turno', 3)->count();

        // Últimos 7 días
        $ultimos7Dias = RegistrosScrap::where('fecha_registro', '>=', now()->subDays(7))
            ->select(DB::raw('DATE(fecha_registro) as fecha'), DB::raw('COUNT(*) as count'))
            ->groupBy('fecha')
            ->orderBy('fecha')
            ->get();

        return response()->json([
            'total_registros' => $totalRegistros,
            'peso_total' => $pesoTotal,
            'bascula_count' => $basculaCount,
            'manual_count' => $manualCount,
            'turno_counts' => [
                'turno_1' => $turno1Count,
                'turno_2' => $turno2Count,
                'turno_3' => $turno3Count
            ],
            'ultimos_7_dias' => $ultimos7Dias
        ]);
    }

    public function stats()
    {
        return response()->json(['message' => 'Este método está deprecado. Usa getRegistroScrapStats()']);
    }
}
