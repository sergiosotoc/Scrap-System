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
        $areasMaquinas = ConfigAreaMaquina::orderBy('orden')
            ->get()
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

            foreach ($validated['registros'] as $registroData) {
                $detallesValidos = collect($registroData['detalles'])
                    ->filter(fn($d) => round(floatval($d['peso']), 3) > 0);

                if ($detallesValidos->isEmpty()) continue;

                $pesoTotal = round($detallesValidos->sum('peso'), 3);

                $registro = RegistrosScrap::updateOrCreate(
                    [
                        'fecha_registro' => $fechaHoy,
                        'turno'          => $registroData['turno'],
                        'area_real'      => strtoupper($registroData['area_real']),
                        'maquina_real'   => strtoupper($registroData['maquina_real']),
                    ],
                    [
                        'operador_id'      => Auth::id(),
                        'peso_total'       => $pesoTotal,
                        'conexion_bascula' => $registroData['conexion_bascula'] ?? false,
                        'observaciones'    => $registroData['observaciones'] ?? 'Registro actualizado',
                    ]
                );

                $registro->detalles()->delete();

                foreach ($detallesValidos as $d) {
                    $registro->detalles()->create([
                        'tipo_scrap_id' => $d['id'],
                        'peso'          => $d['peso']
                    ]);
                }

                $registrosCreados[] = $registro;
            }

            DB::commit();
            return response()->json(['success' => true, 'count' => count($registrosCreados)], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
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
