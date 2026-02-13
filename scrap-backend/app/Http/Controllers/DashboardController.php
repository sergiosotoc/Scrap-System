<?php
// app/Http/Controllers/DashboardController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RegistrosScrap;
use App\Models\RecepcionScrap;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        try {
            $stats = [
                'total_usuarios' => User::count(),
                'total_registros' => RegistrosScrap::count(),
                'total_recepciones' => RecepcionScrap::count(),
                'total_peso_kg' => (float) RegistrosScrap::sum('peso_total'),
                'total_peso_recepciones' => (float) RecepcionScrap::sum('peso_kg'),
                'eficiencia_global' => 98.5
            ];

            $meses = [];
            $produccion = [];
            $recepcion = [];
            for ($i = 5; $i >= 0; $i--) {
                $date = Carbon::now()->subMonths($i);
                $meses[] = strtoupper($date->translatedFormat('M'));
                $produccion[] = round(RegistrosScrap::whereYear('fecha_registro', $date->year)
                    ->whereMonth('fecha_registro', $date->month)
                    ->sum('peso_total'), 2);
                $recepcion[] = round(RecepcionScrap::whereYear('fecha_entrada', $date->year)
                    ->whereMonth('fecha_entrada', $date->month)
                    ->sum('peso_kg'), 2);
            }
            $stats['grafica_barras'] = compact('meses', 'produccion', 'recepcion');

            $distribucionProduccion = DB::table('registro_scrap_detalles')
                ->join('config_tipos_scrap', 'registro_scrap_detalles.tipo_scrap_id', '=', 'config_tipos_scrap.id')
                ->select('config_tipos_scrap.tipo_nombre as name', DB::raw('SUM(peso) as value'))
                ->groupBy('config_tipos_scrap.tipo_nombre')
                ->get();

            $colors = ['#2563EB', '#10B981', '#F59E0B', '#3B82F6', '#8B5CF6', '#EC4899'];
            $stats['distribucion_materiales'] = $distribucionProduccion->map(function ($item, $index) use ($colors) {
                return [
                    'name' => strtoupper($item->name),
                    'value' => (float) $item->value,
                    'color' => $colors[$index % count($colors)]
                ];
            });

            $ultimosRegistros = RegistrosScrap::with(['operador', 'detalles.tipoScrap'])
                ->latest('fecha_registro')
                ->take(5)
                ->get()
                ->map(function ($r) {
                    return [
                        'tipo' => 'registro',
                        'material' => $r->detalles->first()->tipoScrap->tipo_nombre ?? 'VARIOS',
                        'operador' => $r->operador->name ?? 'N/A',
                        'peso' => $r->peso_total,
                        'fecha' => $r->fecha_registro->format('d/m/Y H:i')
                    ];
                });

            $ultimasRecepciones = RecepcionScrap::with('receptor')
                ->latest('fecha_entrada')
                ->take(5)
                ->get()
                ->map(function ($r) {
                    return [
                        'tipo' => 'recepcion',
                        'material' => $r->tipo_material,
                        'receptor' => $r->receptor->name ?? 'N/A',
                        'peso' => $r->peso_kg,
                        'fecha' => $r->fecha_entrada->diffForHumans()
                    ];
                });

            $stats['actividad_reciente'] = $ultimosRegistros->concat($ultimasRecepciones)
                ->sortByDesc('fecha')
                ->values()
                ->take(8);

            return response()->json($stats);
        } catch (\Exception $e) {
            Log::error('Error en DashboardController@stats: ' . $e->getMessage());
            return response()->json([
                'error' => 'Error al obtener estadísticas',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function statsContraloria(Request $request)
    {
        try {
            $fechaInicio = $request->input('fecha_inicio', now()->format('Y-m-d'));
            $fechaFin = $request->input('fecha_fin', now()->format('Y-m-d'));
            $limit = (int) $request->input('limit', 100);
            $offset = (int) $request->input('offset', 0);
            $material = $request->input('material', '');

            $registros = RegistrosScrap::with(['operador', 'detalles.tipoScrap'])
                ->whereBetween('fecha_registro', [
                    $fechaInicio . ' 00:00:00',
                    $fechaFin . ' 23:59:59'
                ])
                ->get();

            $recepciones = RecepcionScrap::with('receptor')
                ->whereBetween('fecha_entrada', [
                    $fechaInicio . ' 00:00:00',
                    $fechaFin . ' 23:59:59'
                ])
                ->get();

            $produccionAgrupada = DB::table('registro_scrap_detalles')
                ->join('registros_scrap', 'registro_scrap_detalles.registro_id', '=', 'registros_scrap.id')
                ->join('config_tipos_scrap', 'registro_scrap_detalles.tipo_scrap_id', '=', 'config_tipos_scrap.id')
                ->whereBetween('registros_scrap.fecha_registro', [
                    $fechaInicio . ' 00:00:00',
                    $fechaFin . ' 23:59:59'
                ])
                ->select(
                    'config_tipos_scrap.tipo_nombre as material',
                    DB::raw('SUM(peso) as total_prod'),
                    DB::raw('COUNT(DISTINCT registros_scrap.id) as registros_count')
                )
                ->groupBy('config_tipos_scrap.tipo_nombre')
                ->get();

            $recepcionAgrupada = DB::table('recepciones_scrap')
                ->whereBetween('fecha_entrada', [
                    $fechaInicio . ' 00:00:00',
                    $fechaFin . ' 23:59:59'
                ])
                ->select(
                    'tipo_material as material',
                    DB::raw('SUM(peso_kg) as total_recep'),
                    DB::raw('COUNT(*) as recepciones_count')
                )
                ->groupBy('tipo_material')
                ->get();

            $totalProduccion = (float) $produccionAgrupada->sum('total_prod');
            $totalRecepcion = (float) $recepcionAgrupada->sum('total_recep');
            $diferencia = round($totalProduccion - $totalRecepcion, 3);

            $porcentajeDiferencia = $totalProduccion > 0
                ? round(($diferencia / $totalProduccion) * 100, 2)
                : 0;

            $movimientos = collect();

            foreach ($registros as $registro) {
                foreach ($registro->detalles as $detalle) {
                    $materialNombre = $detalle->tipoScrap->tipo_nombre ?? 'N/A';

                    if ($material && stripos($materialNombre, $material) === false) {
                        continue;
                    }

                    $observacionesParseadas = $this->parsearObservaciones($registro->observaciones);

                    $movimientos->push([
                        'id' => $registro->id . '-' . $detalle->id,
                        'fecha' => $registro->fecha_registro,
                        'turno' => $registro->turno,
                        'material' => $materialNombre,
                        'peso' => (float) $detalle->peso,
                        'origen' => 'PLANTA',
                        'origen_tipo' => 'produccion',
                        'origen_especifico' => $observacionesParseadas['area'] ?? 'Producción',
                        'destino' => 'ALMACÉN',
                        'destino_especifico' => 'almacenamiento',
                        'responsable' => $registro->operador->name ?? 'N/A',
                        'rol' => 'Operador',
                        'hu_id' => null,
                        'tipo_movimiento' => 'produccion',
                        'conexion_bascula' => (bool) $registro->conexion_bascula,
                        'observaciones' => $registro->observaciones ?? 'Proceso Automático',
                        'observaciones_parseadas' => $observacionesParseadas,
                        'maquina' => $registro->maquina_real ?? null
                    ]);
                }
            }

            foreach ($recepciones as $recepcion) {
                $materialNombre = $recepcion->tipo_material;

                if ($material && stripos($materialNombre, $material) === false) {
                    continue;
                }

                $origenTipo = $recepcion->origen_tipo === 'interna' ? 'PLANTA' : 'EXTERNA';
                $origenEspecifico = $recepcion->origen_especifico ?: ($recepcion->origen_tipo === 'interna' ? 'Planta Interna' : 'Proveedor Externo');

                $destinoEspecifico = $recepcion->destino ?? 'almacenamiento';

                $movimientos->push([
                    'id' => 'R-' . $recepcion->id,
                    'fecha' => $recepcion->fecha_entrada,
                    'turno' => $this->determinarTurno($recepcion->fecha_entrada),
                    'material' => $materialNombre,
                    'peso' => (float) $recepcion->peso_kg,
                    'origen' => $origenTipo,
                    'origen_tipo' => 'recepcion',
                    'origen_especifico' => $origenEspecifico,
                    'destino' => 'DISPOSICIÓN',
                    'destino_especifico' => $destinoEspecifico,
                    'responsable' => $recepcion->receptor->name ?? 'N/A',
                    'rol' => 'Receptor',
                    'hu_id' => $recepcion->numero_hu,
                    'tipo_movimiento' => 'recepcion',
                    'conexion_bascula' => true,
                    'observaciones' => $recepcion->observaciones ?? 'Recepción estándar',
                    'observaciones_parseadas' => [
                        'area' => null,
                        'maquina' => null,
                        'material' => $materialNombre,
                        'notas' => $recepcion->observaciones ? [$recepcion->observaciones] : []
                    ],
                    'maquina' => null
                ]);
            }

            $movimientosAgrupados = $movimientos
                ->groupBy(function ($item) {
                    return implode('|', [
                        Carbon::parse($item['fecha'])->format('Y-m-d'),
                        $item['responsable'],
                        $item['material'],
                        $item['origen'],
                        $item['origen_especifico'],
                        $item['destino_especifico']
                    ]);
                })
                ->map(function ($grupo, $key) {
                    $base = $grupo->first();

                    $hu_id = '';
                    foreach ($grupo as $item) {
                        if (!empty($item['hu_id'])) {
                            $hu_id = $item['hu_id'];
                            break;
                        }
                    }

                     $turnoCounts = [];
                    foreach ($grupo as $item) {
                        $turno = $item['turno'] ?? $this->determinarTurno($item['fecha']);
                        if (!isset($turnoCounts[$turno])) {
                            $turnoCounts[$turno] = 0;
                        }
                        $turnoCounts[$turno]++;
                    }
                    arsort($turnoCounts);
                    $turno = key($turnoCounts);

                    $observacionesColeccion = $grupo->pluck('observaciones')
                        ->filter(function ($obs) {
                            return $obs !== 'Proceso Automático' &&
                                $obs !== 'Recepción estándar' &&
                                !empty($obs);
                        })
                        ->unique()
                        ->values();

                    $observacionesFinales = $observacionesColeccion->isNotEmpty()
                        ? $observacionesColeccion->implode(' | ')
                        : $base['observaciones'];

                    $conexionBascula = $grupo->every('conexion_bascula', true);

                    $observacionesParseadas = [
                        'area' => $grupo->pluck('observaciones_parseadas.area')->filter()->first(),
                        'maquina' => $grupo->pluck('observaciones_parseadas.maquina')->filter()->first(),
                        'material' => $base['material'],
                        'notas' => $grupo->pluck('observaciones_parseadas.notas')
                            ->flatten()
                            ->filter()
                            ->unique()
                            ->values()
                            ->toArray()
                    ];

                    return [
                        'id' => md5($key),
                        'hu_id' => $hu_id,
                        'fecha' => Carbon::parse($base['fecha'])->format('Y-m-d H:i:s'),
                        'fecha_display' => Carbon::parse($base['fecha'])->format('d/m/Y'),
                        'hora_display' => Carbon::parse($base['fecha'])->format('H:i'),
                        'turno' => $turno,
                        'material' => $base['material'],
                        'peso' => round($grupo->sum('peso'), 3),
                        'origen' => $base['origen'],
                        'origen_tipo' => $base['origen_tipo'],
                        'origen_especifico' => $base['origen_especifico'],
                        'destino' => $base['destino_especifico'],
                        'destino_display' => $this->formatoDestinoLegible($base['destino_especifico']),
                        'responsable' => $base['responsable'],
                        'rol' => $base['rol'],
                        'tipo_movimiento' => $base['tipo_movimiento'],
                        'conexion_bascula' => (bool) $conexionBascula,
                        'observaciones' => $observacionesFinales,
                        'observaciones_parseadas' => $observacionesParseadas,
                        'maquina' => $base['maquina'],
                        'count_movimientos' => $grupo->count()
                    ];
                })
                ->values();

            $totalMovimientos = $movimientosAgrupados->count();
            $movimientosPaginados = $movimientosAgrupados
                ->sortByDesc('fecha')
                ->slice($offset, $limit)
                ->values();

            $estadisticasContraloria = $this->calcularEstadisticasContraloria($movimientosAgrupados);

            return response()->json([
                'success' => true,
                'totales' => [
                    'produccion' => $totalProduccion,
                    'recepcion' => $totalRecepcion,
                    'diferencia' => $diferencia,
                    'porcentaje_diferencia' => $porcentajeDiferencia,
                    'registros_produccion' => $produccionAgrupada->sum('registros_count'),
                    'registros_recepcion' => $recepcionAgrupada->sum('recepciones_count')
                ],
                'estadisticas_contraloria' => $estadisticasContraloria,
                'movimientos' => $movimientosPaginados,
                'paginacion' => [
                    'total' => $totalMovimientos,
                    'limit' => $limit,
                    'offset' => $offset,
                    'paginas' => ceil($totalMovimientos / $limit)
                ],
                'filtros_aplicados' => [
                    'fecha_inicio' => $fechaInicio,
                    'fecha_fin' => $fechaFin,
                    'material' => $material,
                    'total_registros_filtrados' => $totalMovimientos
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error en DashboardController@statsContraloria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener estadísticas de contraloría',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function getHistorialModificaciones(Request $request)
    {
        try {
            $fechaInicio = $request->input('fecha_inicio', now()->format('Y-m-d'));
            $fechaFin = $request->input('fecha_fin', now()->format('Y-m-d'));
            $materialFiltro = $request->input('material', '');

            $historialRaw = DB::table('registros_scrap_historial as h')
                ->join('registros_scrap as r', 'h.registro_id', '=', 'r.id')
                ->select(
                    'h.id',
                    'h.registro_id',
                    'h.tipo_movimiento',
                    'h.observaciones',
                    'h.responsable',
                    'h.created_at as fecha',
                    'r.maquina_real',
                    'r.area_real'
                )
                ->whereBetween('h.created_at', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
                ->get();

            $historialDesglosado = collect();

            foreach ($historialRaw as $item) {
                if (str_contains($item->observaciones, '|')) {
                    $notas = explode('|', $item->observaciones);

                    foreach ($notas as $index => $nota) {
                        $notaLimpia = trim($nota);

                        if ($materialFiltro && stripos($notaLimpia, $materialFiltro) === false) {
                            continue;
                        }

                        $nombreMaterial = 'General';
                        if (preg_match('/-\s*(.*?)]/', $notaLimpia, $matches)) {
                            $nombreMaterial = trim($matches[1]);
                        }

                        $historialDesglosado->push([
                            'id' => $item->id . '-' . $index,
                            'registro_id' => $item->registro_id,
                            'fecha' => $item->fecha,
                            'tipo_accion' => $this->detectarTipoAccion($notaLimpia),
                            'material' => $nombreMaterial,
                            'detalle_personalizado' => $notaLimpia,
                            'responsable' => $item->responsable,
                            'maquina' => $item->maquina_real
                        ]);
                    }
                } else {
                    if ($materialFiltro && stripos($item->observaciones, $materialFiltro) === false) continue;

                    $historialDesglosado->push([
                        'id' => $item->id,
                        'registro_id' => $item->registro_id,
                        'fecha' => $item->fecha,
                        'tipo_accion' => strtoupper($item->tipo_movimiento),
                        'material' => 'General',
                        'detalle_personalizado' => $item->observaciones,
                        'responsable' => $item->responsable,
                        'maquina' => $item->maquina_real
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'historial' => $historialDesglosado->sortByDesc('fecha')->values()
            ]);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 500);
        }
    }

    private function detectarTipoAccion($texto)
    {
        if (stripos($texto, 'SUMADO') !== false) return 'SUMA';
        if (stripos($texto, 'EDITADO') !== false) return 'EDICIÓN';
        if (stripos($texto, 'BORRADO') !== false) return 'BORRADO';
        return 'CREACIÓN';
    }

    private function detectarTipo($texto)
    {
        if (str_contains($texto, 'SUMADO')) return 'SUMA';
        if (str_contains($texto, 'EDITADO')) return 'EDICIÓN';
        if (str_contains($texto, 'BORRADO')) return 'BORRADO';
        return 'CREACIÓN';
    }

    public function statsMaterialesContraloria(Request $request)
    {
        try {
            $fechaInicio = $request->input('fecha_inicio', now()->subDays(30)->format('Y-m-d'));
            $fechaFin = $request->input('fecha_fin', now()->format('Y-m-d'));

            $materiales = ConfigTipoScrap::orderBy('tipo_nombre')->get();

            $statsMateriales = collect();

            foreach ($materiales as $material) {
                $nombreMaterial = $material->tipo_nombre;

                $produccion = DB::table('registro_scrap_detalles')
                    ->join('registros_scrap', 'registro_scrap_detalles.registro_id', '=', 'registros_scrap.id')
                    ->where('registro_scrap_detalles.tipo_scrap_id', $material->id)
                    ->whereBetween('registros_scrap.fecha_registro', [
                        $fechaInicio . ' 00:00:00',
                        $fechaFin . ' 23:59:59'
                    ])
                    ->select(
                        DB::raw('SUM(peso) as total_peso'),
                        DB::raw('COUNT(DISTINCT registros_scrap.id) as total_registros'),
                        DB::raw('AVG(peso) as promedio_peso')
                    )
                    ->first();

                $recepcion = DB::table('recepciones_scrap')
                    ->where('tipo_material', $nombreMaterial)
                    ->whereBetween('fecha_entrada', [
                        $fechaInicio . ' 00:00:00',
                        $fechaFin . ' 23:59:59'
                    ])
                    ->select(
                        DB::raw('SUM(peso_kg) as total_peso'),
                        DB::raw('COUNT(*) as total_registros'),
                        DB::raw('AVG(peso_kg) as promedio_peso')
                    )
                    ->first();

                $totalProduccion = (float) ($produccion->total_peso ?? 0);
                $totalRecepcion = (float) ($recepcion->total_peso ?? 0);
                $diferencia = $totalProduccion - $totalRecepcion;

                $porcentajeDiferencia = $totalProduccion > 0
                    ? round(($diferencia / $totalProduccion) * 100, 2)
                    : 0;

                $estado = match (true) {
                    abs($porcentajeDiferencia) <= 1 => 'normal',
                    abs($porcentajeDiferencia) <= 5 => 'alerta',
                    default => 'critico'
                };

                $statsMateriales->push([
                    'material_id' => $material->id,
                    'material_nombre' => $nombreMaterial,
                    'produccion' => [
                        'total_peso' => $totalProduccion,
                        'total_registros' => $produccion->total_registros ?? 0,
                        'promedio_peso' => round($produccion->promedio_peso ?? 0, 2)
                    ],
                    'recepcion' => [
                        'total_peso' => $totalRecepcion,
                        'total_registros' => $recepcion->total_registros ?? 0,
                        'promedio_peso' => round($recepcion->promedio_peso ?? 0, 2)
                    ],
                    'diferencia' => round($diferencia, 3),
                    'porcentaje_diferencia' => $porcentajeDiferencia,
                    'estado' => $estado,
                    'prioridad' => abs($diferencia),
                    'color' => $material->color_hex ?? $this->generarColor($nombreMaterial)
                ]);
            }

            $statsMateriales = $statsMateriales->sortByDesc('prioridad')->values();

            return response()->json([
                'success' => true,
                'materiales' => $statsMateriales,
                'resumen' => [
                    'total_materiales' => $statsMateriales->count(),
                    'materiales_normales' => $statsMateriales->where('estado', 'normal')->count(),
                    'materiales_alerta' => $statsMateriales->where('estado', 'alerta')->count(),
                    'materiales_criticos' => $statsMateriales->where('estado', 'critico')->count(),
                    'diferencia_total' => $statsMateriales->sum('diferencia')
                ],
                'filtros' => [
                    'fecha_inicio' => $fechaInicio,
                    'fecha_fin' => $fechaFin
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error en DashboardController@statsMaterialesContraloria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al obtener estadísticas por material',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function reporteConciliacionDiaria(Request $request)
    {
        try {
            $fecha = $request->input('fecha', now()->format('Y-m-d'));

            $produccionDiaria = DB::table('registros_scrap')
                ->join('registro_scrap_detalles', 'registros_scrap.id', '=', 'registro_scrap_detalles.registro_id')
                ->join('config_tipos_scrap', 'registro_scrap_detalles.tipo_scrap_id', '=', 'config_tipos_scrap.id')
                ->whereDate('registros_scrap.fecha_registro', $fecha)
                ->select(
                    'config_tipos_scrap.tipo_nombre as material',
                    DB::raw('SUM(registro_scrap_detalles.peso) as peso_produccion'),
                    DB::raw('COUNT(DISTINCT registros_scrap.id) as registros_produccion'),
                    DB::raw("GROUP_CONCAT(DISTINCT registros_scrap.area_real) as areas")
                )
                ->groupBy('config_tipos_scrap.tipo_nombre')
                ->get();

            $recepcionDiaria = DB::table('recepciones_scrap')
                ->whereDate('fecha_entrada', $fecha)
                ->select(
                    'tipo_material as material',
                    DB::raw('SUM(peso_kg) as peso_recepcion'),
                    DB::raw('COUNT(*) as registros_recepcion'),
                    DB::raw("GROUP_CONCAT(DISTINCT origen_especifico) as origenes")
                )
                ->groupBy('tipo_material')
                ->get();

            $reporte = collect();
            $materiales = $produccionDiaria->pluck('material')->merge($recepcionDiaria->pluck('material'))->unique();

            foreach ($materiales as $material) {
                $prod = $produccionDiaria->where('material', $material)->first();
                $recep = $recepcionDiaria->where('material', $material)->first();

                $pesoProd = $prod ? (float) $prod->peso_produccion : 0;
                $pesoRecep = $recep ? (float) $recep->peso_recepcion : 0;
                $diferencia = $pesoProd - $pesoRecep;

                $reporte->push([
                    'material' => $material,
                    'produccion' => [
                        'peso' => $pesoProd,
                        'registros' => $prod ? $prod->registros_produccion : 0,
                        'areas' => $prod ? explode(',', $prod->areas) : []
                    ],
                    'recepcion' => [
                        'peso' => $pesoRecep,
                        'registros' => $recep ? $recep->registros_recepcion : 0,
                        'origenes' => $recep ? explode(',', $recep->origenes) : []
                    ],
                    'diferencia' => round($diferencia, 3),
                    'conciliado' => abs($diferencia) < 0.1,
                    'fecha' => $fecha
                ]);
            }

            $totales = [
                'peso_produccion' => $reporte->sum('produccion.peso'),
                'peso_recepcion' => $reporte->sum('recepcion.peso'),
                'diferencia_total' => $reporte->sum('diferencia'),
                'materiales_conciliados' => $reporte->where('conciliado', true)->count(),
                'materiales_pendientes' => $reporte->where('conciliado', false)->count()
            ];

            return response()->json([
                'success' => true,
                'fecha' => $fecha,
                'reporte' => $reporte->sortByDesc('diferencia')->values(),
                'totales' => $totales,
                'resumen' => [
                    'total_materiales' => $reporte->count(),
                    'conciliacion_porcentaje' => $reporte->count() > 0
                        ? round(($reporte->where('conciliado', true)->count() / $reporte->count()) * 100, 1)
                        : 0
                ]
            ]);
        } catch (\Exception $e) {
            Log::error('Error en DashboardController@reporteConciliacionDiaria: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'error' => 'Error al generar reporte de conciliación',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    private function determinarTurno($fecha)
    {
        try {
            $dt = Carbon::parse($fecha)->timezone(config('app.timezone'));
            $hora = $dt->hour;

            if ($hora >= 7 && $hora < 15) {
                return 1;
            } else if ($hora >= 15 && $hora < 23) {
                return 2;
            } else {
                return 3;
            }
        } catch (\Exception $e) {
            return 1;
        }
    }

    private function formatoDestinoLegible($destino)
    {
        $formatos = [
            'almacenamiento' => 'ALMACENAMIENTO',
            'reciclaje' => 'RECICLAJE',
            'venta' => 'VENDIDO',
            'disposicion' => 'DISPOSICIÓN',
            'proceso' => 'EN PROCESO'
        ];

        return $formatos[strtolower($destino)] ?? strtoupper($destino);
    }

    private function parsearObservaciones($observaciones)
    {
        if (empty($observaciones) || $observaciones === 'Proceso Automático') {
            return [
                'area' => null,
                'maquina' => null,
                'material' => null,
                'notas' => []
            ];
        }

        $partes = [
            'area' => null,
            'maquina' => null,
            'material' => null,
            'notas' => []
        ];

        $lineas = explode(' | ', $observaciones);

        foreach ($lineas as $linea) {
            $linea = trim($linea);

            if (stripos($linea, 'Área:') === 0 || stripos($linea, 'Area:') === 0) {
                $partes['area'] = trim(str_replace(['Área:', 'Area:'], '', $linea));
            } elseif (stripos($linea, 'Máquina:') === 0 || stripos($linea, 'Maquina:') === 0) {
                $partes['maquina'] = trim(str_replace(['Máquina:', 'Maquina:'], '', $linea));
            } elseif (stripos($linea, 'Material:') === 0) {
                $partes['material'] = trim(str_replace('Material:', '', $linea));
            } elseif (!empty($linea)) {
                $partes['notas'][] = $linea;
            }
        }

        return $partes;
    }

    private function calcularEstadisticasContraloria($movimientos)
    {
        $totalMovimientos = $movimientos->count();
        $totalPeso = $movimientos->sum('peso');

        $basculaCount = $movimientos->where('conexion_bascula', true)->count();
        $manualCount = $totalMovimientos - $basculaCount;

        $produccionCount = $movimientos->where('origen', 'PLANTA')->count();
        $recepcionCount = $movimientos->where('origen', 'EXTERNA')->count();

        $turno1Count = $movimientos->where('turno', 1)->count();
        $turno2Count = $movimientos->where('turno', 2)->count();
        $turno3Count = $movimientos->where('turno', 3)->count();

        $conObservaciones = $movimientos->filter(function ($mov) {
            return $mov['observaciones'] !== 'Proceso Automático' &&
                $mov['observaciones'] !== 'Recepción estándar';
        })->count();

        $topMateriales = $movimientos->groupBy('material')
            ->map(function ($grupo, $material) {
                return [
                    'material' => $material,
                    'total_peso' => $grupo->sum('peso'),
                    'count' => $grupo->count()
                ];
            })
            ->sortByDesc('total_peso')
            ->take(5)
            ->values();

        return [
            'total_movimientos' => $totalMovimientos,
            'total_peso' => round($totalPeso, 2),
            'metodo_captura' => [
                'bascula' => $basculaCount,
                'manual' => $manualCount,
                'porcentaje_bascula' => $totalMovimientos > 0 ? round(($basculaCount / $totalMovimientos) * 100, 1) : 0
            ],
            'origen' => [
                'produccion' => $produccionCount,
                'recepcion' => $recepcionCount
            ],
            'turnos' => [
                'turno_1' => $turno1Count,
                'turno_2' => $turno2Count,
                'turno_3' => $turno3Count
            ],
            'observaciones' => [
                'con_observaciones' => $conObservaciones,
                'sin_observaciones' => $totalMovimientos - $conObservaciones,
                'porcentaje_con_obs' => $totalMovimientos > 0 ? round(($conObservaciones / $totalMovimientos) * 100, 1) : 0
            ],
            'top_materiales' => $topMateriales
        ];
    }

    private function generarHistorialSimulado($fechaInicio, $fechaFin, $tipo)
    {
        $historial = collect();

        if ($tipo === 'todos' || $tipo === 'produccion') {
            $registros = RegistrosScrap::with(['operador', 'detalles'])
                ->whereBetween('fecha_registro', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
                ->limit(50)
                ->get();

            foreach ($registros as $registro) {
                $historial->push((object)[
                    'id' => 'P-' . $registro->id,
                    'registro_id' => $registro->id,
                    'tipo_movimiento' => 'create',
                    'campo_modificado' => 'Registro completo',
                    'valor_anterior' => null,
                    'valor_nuevo' => 'Registro creado',
                    'responsable' => $registro->operador->name ?? 'Sistema',
                    'fecha_modificacion' => $registro->created_at,
                    'origen' => 'produccion',
                    'material' => $registro->detalles->first()->tipoScrap->tipo_nombre ?? 'N/A'
                ]);
            }
        }

        if ($tipo === 'todos' || $tipo === 'recepcion') {
            $recepciones = RecepcionScrap::with('receptor')
                ->whereBetween('fecha_entrada', [$fechaInicio . ' 00:00:00', $fechaFin . ' 23:59:59'])
                ->limit(50)
                ->get();

            foreach ($recepciones as $recepcion) {
                $historial->push((object)[
                    'id' => 'R-' . $recepcion->id,
                    'registro_id' => $recepcion->id,
                    'tipo_movimiento' => 'create',
                    'campo_modificado' => 'Recepción completa',
                    'valor_anterior' => null,
                    'valor_nuevo' => 'Recepción creada',
                    'responsable' => $recepcion->receptor->name ?? 'Sistema',
                    'fecha_modificacion' => $recepcion->created_at,
                    'origen' => 'recepcion',
                    'material' => $recepcion->tipo_material
                ]);

                if ($recepcion->destino && rand(0, 3) === 0) {
                    $historial->push((object)[
                        'id' => 'R-' . $recepcion->id . '-U',
                        'registro_id' => $recepcion->id,
                        'tipo_movimiento' => 'update',
                        'campo_modificado' => 'destino',
                        'valor_anterior' => 'almacenamiento',
                        'valor_nuevo' => $recepcion->destino,
                        'responsable' => $recepcion->receptor->name ?? 'Sistema',
                        'fecha_modificacion' => $recepcion->updated_at,
                        'origen' => 'recepcion',
                        'material' => $recepcion->tipo_material
                    ]);
                }
            }
        }

        return $historial;
    }

    private function generarColor($texto)
    {
        $hash = md5($texto);
        return sprintf('#%s', substr($hash, 0, 6));
    }
}
