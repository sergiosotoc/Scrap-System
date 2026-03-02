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
use App\Services\HistorialService;

class RegistrosScrapController extends Controller
{
    public function getConfiguracion()
    {
        $areasMaquinas = ConfigAreaMaquina::with('materialesPermitidos:id')
            ->orderBy('orden')
            ->get()
            ->map(function ($item) {
                $item->permitidos_ids = $item->materialesPermitidos->pluck('id');
                return $item;
            })
            ->groupBy('area_nombre');

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
            $fechaHoy = now()->format('Y-m-d');
            $turno = $validated['turno'];
            $area = strtoupper($validated['area_real']);
            $maquina = strtoupper($validated['maquina_real']);

            // Usar Carbon para manejar fechas correctamente
            $fechaActual = now(); // Esto incluye hora, minuto y segundo

            // Buscar si existe un registro para hoy, mismo turno, área y máquina
            $registroExistente = RegistrosScrap::whereDate('fecha_registro', $fechaHoy)
                ->where('turno', $turno)
                ->where('area_real', $area)
                ->where('maquina_real', $maquina)
                ->first();

            $pesoTotal = 0;
            $detallesParaGuardar = [];

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

            if ($registroExistente) {
                // ACTUALIZAR REGISTRO EXISTENTE - SUMAR PESOS
                Log::info('🔄 Registro existente encontrado. Sumando pesos...', [
                    'registro_id' => $registroExistente->id,
                    'peso_anterior' => $registroExistente->peso_total,
                    'peso_nuevo' => $pesoTotal
                ]);

                // Actualizar observaciones para indicar que se sumó
                $observacionesAnteriores = $registroExistente->observaciones ?? '';
                $nuevaObservacion = $validated['observaciones'] ?? 'Proceso Automático';
                $observacionesCombinadas = $observacionesAnteriores
                    ? $observacionesAnteriores . ' | ' . $nuevaObservacion . ' (Sumado)'
                    : $nuevaObservacion . ' (Sumado)';

                // Actualizar peso total (sumar)
                $registroExistente->peso_total = round($registroExistente->peso_total + $pesoTotal, 3);
                $registroExistente->observaciones = $observacionesCombinadas;
                $registroExistente->conexion_bascula = $registroExistente->conexion_bascula || ($validated['conexion_bascula'] ?? false);

                // IMPORTANTE: Actualizar la fecha_registro con la hora actual
                $registroExistente->fecha_registro = $fechaActual;

                $registroExistente->save();

                // Actualizar o crear detalles
                foreach ($detallesParaGuardar as $d) {
                    $detalleExistente = RegistroScrapDetalle::where('registro_id', $registroExistente->id)
                        ->where('tipo_scrap_id', $d['tipo_scrap_id'])
                        ->first();

                    if ($detalleExistente) {
                        // Sumar al detalle existente
                        $detalleExistente->peso = round($detalleExistente->peso + $d['peso'], 3);
                        $detalleExistente->save();
                        Log::info('➕ Detalle actualizado (sumado)', [
                            'tipo_scrap_id' => $d['tipo_scrap_id'],
                            'nuevo_peso' => $detalleExistente->peso
                        ]);
                    } else {
                        // Crear nuevo detalle
                        RegistroScrapDetalle::create([
                            'registro_id' => $registroExistente->id,
                            'tipo_scrap_id' => $d['tipo_scrap_id'],
                            'peso' => $d['peso']
                        ]);
                        Log::info('➕ Nuevo detalle creado', [
                            'tipo_scrap_id' => $d['tipo_scrap_id'],
                            'peso' => $d['peso']
                        ]);
                    }
                }

                $observacionesCompletas = 'PESOS SUMADOS. ' . ($validated['observaciones'] ?? 'Sin observaciones');
                HistorialService::registrarCreacionProduccion($registroExistente->id, $observacionesCompletas);

                DB::commit();

                $registroExistente->load('operador', 'detalles.tipoScrap');

                return response()->json([
                    'success' => true,
                    'message' => 'Pesos sumados exitosamente al registro existente',
                    'registro' => $registroExistente,
                    'peso_total' => $registroExistente->peso_total,
                    'es_suma' => true,
                    'peso_sumado' => $pesoTotal
                ], 200);
            } else {
                // CREAR NUEVO REGISTRO
                $registro = RegistrosScrap::create([
                    'operador_id' => Auth::id(),
                    'turno' => $turno,
                    'area_real' => $area,
                    'maquina_real' => $maquina,
                    'peso_total' => $pesoTotal,
                    'conexion_bascula' => $validated['conexion_bascula'] ?? false,
                    'observaciones' => $validated['observaciones'] ?? null,
                    'fecha_registro' => $fechaActual // Usar la fecha con hora
                ]);

                foreach ($detallesParaGuardar as $d) {
                    RegistroScrapDetalle::create([
                        'registro_id' => $registro->id,
                        'tipo_scrap_id' => $d['tipo_scrap_id'],
                        'peso' => $d['peso']
                    ]);
                }

                $observacionesCompletas = $validated['observaciones'] ?? 'Proceso Automático';
                HistorialService::registrarCreacionProduccion($registro->id, $observacionesCompletas);

                DB::commit();

                $registro->load('operador', 'detalles.tipoScrap');

                return response()->json([
                    'success' => true,
                    'message' => 'Registro guardado exitosamente',
                    'registro' => $registro,
                    'peso_total' => $registro->peso_total,
                    'es_suma' => false
                ], 201);
            }
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error creando registro scrap: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Error interno al guardar: ' . $e->getMessage()
            ], 500);
        }
    }

    public function storeBatch(Request $request)
    {
        $validated = $request->validate([
            'registros' => 'required|array',
            'registros.*.area_real' => 'required|string',
            'registros.*.maquina_real' => 'required|string',
            'registros.*.turno' => 'required',
            'registros.*.detalles' => 'required|array'
        ]);

        DB::beginTransaction();
        try {
            $registrosCreados = [];
            $fechaHoy = now()->format('Y-m-d');
            $fechaActual = now(); // Con hora
            $resultados = [
                'creados' => 0,
                'actualizados' => 0
            ];

            foreach ($validated['registros'] as $registroData) {
                $detallesValidos = collect($registroData['detalles'])
                    ->filter(fn($d) => round(floatval($d['peso']), 3) > 0);

                if ($detallesValidos->isEmpty()) continue;

                $pesoTotal = round($detallesValidos->sum('peso'), 3);
                $area = strtoupper($registroData['area_real']);
                $maquina = strtoupper($registroData['maquina_real']);
                $turno = $registroData['turno'];

                // Buscar si existe registro
                $registroExistente = RegistrosScrap::whereDate('fecha_registro', $fechaHoy)
                    ->where('turno', $turno)
                    ->where('area_real', $area)
                    ->where('maquina_real', $maquina)
                    ->first();

                if ($registroExistente) {
                    // ACTUALIZAR - SUMAR PESOS
                    $registroExistente->peso_total = round($registroExistente->peso_total + $pesoTotal, 3);

                    // Combinar observaciones
                    $obsNueva = $registroData['observaciones'] ?? 'Registro actualizado';
                    $registroExistente->observaciones = $registroExistente->observaciones
                        ? $registroExistente->observaciones . ' | ' . $obsNueva . ' (Sumado)'
                        : $obsNueva . ' (Sumado)';

                    $registroExistente->conexion_bascula = $registroExistente->conexion_bascula || ($registroData['conexion_bascula'] ?? false);

                    // Actualizar fecha_registro con hora actual
                    $registroExistente->fecha_registro = $fechaActual;

                    $registroExistente->save();

                    // Actualizar detalles
                    foreach ($detallesValidos as $d) {
                        $detalleExistente = RegistroScrapDetalle::where('registro_id', $registroExistente->id)
                            ->where('tipo_scrap_id', $d['id'])
                            ->first();

                        if ($detalleExistente) {
                            $detalleExistente->peso = round($detalleExistente->peso + $d['peso'], 3);
                            $detalleExistente->save();
                        } else {
                            $registroExistente->detalles()->create([
                                'tipo_scrap_id' => $d['id'],
                                'peso' => $d['peso']
                            ]);
                        }
                    }

                    $registrosCreados[] = $registroExistente;
                    $resultados['actualizados']++;
                } else {
                    // CREAR NUEVO REGISTRO
                    $registro = RegistrosScrap::create([
                        'operador_id' => Auth::id(),
                        'turno' => $turno,
                        'area_real' => $area,
                        'maquina_real' => $maquina,
                        'peso_total' => $pesoTotal,
                        'conexion_bascula' => $registroData['conexion_bascula'] ?? false,
                        'observaciones' => $registroData['observaciones'] ?? 'Registro creado',
                        'fecha_registro' => $fechaActual // Con hora
                    ]);

                    foreach ($detallesValidos as $d) {
                        $registro->detalles()->create([
                            'tipo_scrap_id' => $d['id'],
                            'peso' => $d['peso']
                        ]);
                    }

                    $registrosCreados[] = $registro;
                    $resultados['creados']++;
                }
            }

            DB::commit();

            $mensaje = [];
            if ($resultados['creados'] > 0) {
                $mensaje[] = "{$resultados['creados']} nuevos registros creados";
            }
            if ($resultados['actualizados'] > 0) {
                $mensaje[] = "{$resultados['actualizados']} registros actualizados (pesos sumados)";
            }

            return response()->json([
                'success' => true,
                'message' => implode(', ', $mensaje),
                'count' => count($registrosCreados),
                'detalle' => $resultados
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en storeBatch: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al procesar el lote: ' . $e->getMessage()
            ], 500);
        }
    }

    public function checkExistentes(Request $request)
    {
        $validated = $request->validate([
            'turno' => 'required|in:1,2,3',
            'area_real' => 'required|string',
            'maquina_real' => 'required|string',
            'fecha' => 'sometimes|date'
        ]);

        $fecha = $validated['fecha'] ?? now()->format('Y-m-d');

        $registroExistente = RegistrosScrap::whereDate('fecha_registro', $fecha)
            ->where('turno', $validated['turno'])
            ->where('area_real', strtoupper($validated['area_real']))
            ->where('maquina_real', strtoupper($validated['maquina_real']))
            ->with('detalles.tipoScrap')
            ->first();

        if ($registroExistente) {
            $detalles = [];
            foreach ($registroExistente->detalles as $detalle) {
                $detalles[] = [
                    'id' => $detalle->tipo_scrap_id,
                    'nombre' => $detalle->tipoScrap->tipo_nombre ?? 'Desconocido',
                    'peso' => $detalle->peso
                ];
            }

            return response()->json([
                'existe' => true,
                'registro_id' => $registroExistente->id,
                'peso_total' => $registroExistente->peso_total,
                'detalles' => $detalles,
                'operador' => $registroExistente->operador->name ?? 'Desconocido',
                'fecha_registro' => $registroExistente->fecha_registro
            ]);
        }

        return response()->json([
            'existe' => false
        ]);
    }

    public function index(Request $request)
    {
        $user = Auth::user();

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
                $data = $registro->toArray();

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

        if ($request->has('area') && $request->area != '') {
            $query->where('area_real', $request->area);
        }

        if ($request->has('turno') && $request->turno != '') {
            $query->where('turno', $request->turno);
        }

        if ($request->has('fecha') && $request->fecha != '') {
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

        $totalRegistros = $query->count();
        $pesoTotal = $query->sum('peso_total');

        $basculaCount = RegistrosScrap::where('conexion_bascula', true)->count();
        $manualCount = $totalRegistros - $basculaCount;

        $turno1Count = RegistrosScrap::where('turno', 1)->count();
        $turno2Count = RegistrosScrap::where('turno', 2)->count();
        $turno3Count = RegistrosScrap::where('turno', 3)->count();

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
