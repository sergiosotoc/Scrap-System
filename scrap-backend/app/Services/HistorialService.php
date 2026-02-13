<?php
// app/Services/HistorialService.php

namespace App\Services;

use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use Carbon\Carbon;
use Illuminate\Support\Facades\Schema;

class HistorialService
{
    private static function tablaExiste($nombreTabla)
    {
        return Schema::hasTable($nombreTabla);
    }

    public static function registrarEdicionManual($registroId, $campoModificado, $valorAnterior, $valorNuevo, $observaciones = null)
    {
        try {
            if (!self::tablaExiste('registros_scrap_historial')) {
                \Log::warning('Tabla registros_scrap_historial no existe');
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            if ($valorAnterior == $valorNuevo) {
                return false;
            }
            
            $valorAnteriorFormateado = is_numeric($valorAnterior) 
                ? number_format($valorAnterior, 3) . ' kg' 
                : $valorAnterior;
                
            $valorNuevoFormateado = is_numeric($valorNuevo) 
                ? number_format($valorNuevo, 3) . ' kg' 
                : $valorNuevo;
            
            DB::table('registros_scrap_historial')->insert([
                'registro_id' => $registroId,
                'tipo_movimiento' => 'update',
                'campo_modificado' => $campoModificado,
                'valor_anterior' => $valorAnteriorFormateado,
                'valor_nuevo' => $valorNuevoFormateado,
                'observaciones' => $observaciones ?? "Edición manual por {$user->name}",
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'operador',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial de EDICIÓN MANUAL registrado: Registro {$registroId}, Campo: {$campoModificado}");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando edición manual: ' . $e->getMessage());
            return false;
        }
    }

    public static function registrarSumaManual($registroId, $campoModificado, $valorAnterior, $valorNuevo, $cantidadSumada)
    {
        try {
            if (!self::tablaExiste('registros_scrap_historial')) {
                \Log::warning('Tabla registros_scrap_historial no existe');
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            $valorAnteriorFormateado = number_format($valorAnterior, 3) . ' kg';
            $valorNuevoFormateado = number_format($valorNuevo, 3) . ' kg';
            $cantidadSumadaFormateada = number_format($cantidadSumada, 3) . ' kg';
            
            DB::table('registros_scrap_historial')->insert([
                'registro_id' => $registroId,
                'tipo_movimiento' => 'suma',
                'campo_modificado' => $campoModificado,
                'valor_anterior' => $valorAnteriorFormateado,
                'valor_nuevo' => $valorNuevoFormateado,
                'observaciones' => "Suma manual de {$cantidadSumadaFormateada} por {$user->name}",
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'operador',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial de SUMA MANUAL registrado: Registro {$registroId}, Campo: {$campoModificado}");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando suma manual: ' . $e->getMessage());
            return false;
        }
    }

    public static function registrarBorrado($registroId, $campoModificado, $valorAnterior, $observaciones = null)
    {
        try {
            if (!self::tablaExiste('registros_scrap_historial')) {
                \Log::warning('Tabla registros_scrap_historial no existe');
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            $valorAnteriorFormateado = is_numeric($valorAnterior) 
                ? number_format($valorAnterior, 3) . ' kg' 
                : $valorAnterior;
            
            DB::table('registros_scrap_historial')->insert([
                'registro_id' => $registroId,
                'tipo_movimiento' => 'delete',
                'campo_modificado' => $campoModificado,
                'valor_anterior' => $valorAnteriorFormateado,
                'valor_nuevo' => null,
                'observaciones' => $observaciones ?? "Borrado por {$user->name}",
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'operador',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial de BORRADO registrado: Registro {$registroId}, Campo: {$campoModificado}");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando borrado: ' . $e->getMessage());
            return false;
        }
    }

    public static function registrarCreacionManual($registroId, $esBascula = false, $observaciones = null)
    {
        if ($esBascula) {
            \Log::info("Creación por báscula automática - NO se registra en historial: Registro {$registroId}");
            return false;
        }

        try {
            if (!self::tablaExiste('registros_scrap_historial')) {
                \Log::warning('Tabla registros_scrap_historial no existe');
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            DB::table('registros_scrap_historial')->insert([
                'registro_id' => $registroId,
                'tipo_movimiento' => 'create_manual',
                'campo_modificado' => 'registro_completo',
                'valor_anterior' => null,
                'valor_nuevo' => 'Registro creado manualmente',
                'observaciones' => $observaciones ?? "Creación manual por {$user->name}",
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'operador',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial de CREACIÓN MANUAL registrado: Registro {$registroId}");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando creación manual: ' . $e->getMessage());
            return false;
        }
    }

    public static function registrarCreacionProduccion($registroId, $observacionesCompletas)
    {
        \Log::warning('Método registrarCreacionProduccion es obsoleto. Usar registrarCreacionManual con parámetro $esBascula');
        return self::registrarCreacionManual($registroId, false, $observacionesCompletas);
    }

    public static function registrarCreacionBatchProduccion($registrosIds, $countRegistros, $esBascula = false)
    {
        try {
            if ($esBascula) {
                \Log::info("Batch por báscula automática - NO se registra en historial: {$countRegistros} registros");
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            $observaciones = "Creación batch manual de {$countRegistros} registros";
            
            DB::table('registros_scrap_historial')->insert([
                'registro_id' => $registrosIds[0] ?? null,
                'tipo_movimiento' => 'batch_create',
                'campo_modificado' => 'batch_registros',
                'valor_anterior' => null,
                'valor_nuevo' => json_encode($registrosIds),
                'observaciones' => $observaciones,
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'operador',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial BATCH registrado: {$countRegistros} registros");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando historial batch: ' . $e->getMessage());
            return false;
        }
    }

    public static function registrarHistorialRecepcion($recepcionId, $tipoMovimiento, $campoModificado = null, $valorAnterior = null, $valorNuevo = null, $observaciones = null)
    {
        try {
            if (!self::tablaExiste('recepciones_scrap_historial')) {
                \Log::warning('Tabla recepciones_scrap_historial no existe');
                return false;
            }

            $user = Auth::user();
            $request = app(Request::class);
            
            $valorAnteriorFormateado = is_numeric($valorAnterior) 
                ? number_format($valorAnterior, 3) . ' kg' 
                : $valorAnterior;
                
            $valorNuevoFormateado = is_numeric($valorNuevo) 
                ? number_format($valorNuevo, 3) . ' kg' 
                : $valorNuevo;
            
            DB::table('recepciones_scrap_historial')->insert([
                'recepcion_id' => $recepcionId,
                'tipo_movimiento' => $tipoMovimiento,
                'campo_modificado' => $campoModificado,
                'valor_anterior' => $valorAnteriorFormateado,
                'valor_nuevo' => $valorNuevoFormateado,
                'observaciones' => $observaciones,
                'responsable' => $user->name ?? 'Sistema',
                'rol' => $user->role ?? 'sistema',
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent(),
                'created_at' => now(),
                'updated_at' => now()
            ]);
            
            \Log::info("Historial de recepción registrado: Recepción {$recepcionId}, Tipo: {$tipoMovimiento}");
            return true;
        } catch (\Exception $e) {
            \Log::error('Error registrando historial de recepción: ' . $e->getMessage());
            return false;
        }
    }

    public static function parsearObservacionesParaContraloria($observaciones, $tipo = 'produccion')
    {
        if (empty($observaciones) || $observaciones === 'Proceso Automático') {
            return [
                'area' => null,
                'maquina' => null,
                'material' => null,
                'notas' => [],
                'tipo' => $tipo,
                'original' => $observaciones
            ];
        }

        $partes = [
            'area' => null,
            'maquina' => null,
            'material' => null,
            'notas' => [],
            'tipo' => $tipo,
            'original' => $observaciones
        ];

        $lineas = explode(' | ', $observaciones);

        foreach ($lineas as $linea) {
            $linea = trim($linea);
            
            if (preg_match('/(?:Área|Area|AREA)[:\s]+(.+)/i', $linea, $matches)) {
                $partes['area'] = trim($matches[1]);
            }
            elseif (preg_match('/(?:Máquina|Maquina|MAQUINA)[:\s]+(.+)/i', $linea, $matches)) {
                $partes['maquina'] = trim($matches[1]);
            }
            elseif (preg_match('/(?:Material|MATERIAL)[:\s]+(.+)/i', $linea, $matches)) {
                $partes['material'] = trim($matches[1]);
            }
            elseif (preg_match('/(?:Turno|TURNO)[:\s]+(\d+)/i', $linea, $matches)) {
                $partes['notas'][] = $linea;
            }
            elseif (!empty($linea) && !in_array(strtolower($linea), ['proceso automático', 'registro automático'])) {
                $partes['notas'][] = $linea;
            }
        }

        return $partes;
    }

    public static function obtenerHistorialModificaciones($fechaInicio, $fechaFin, $tipo = 'todos', $responsable = '', $campo = '')
    {
        $historial = collect();
        
        if ($tipo === 'todos' || $tipo === 'produccion') {
            $queryProd = DB::table('registros_scrap_historial')
                ->join('registros_scrap', 'registros_scrap_historial.registro_id', '=', 'registros_scrap.id')
                ->leftJoin('users', 'registros_scrap.operador_id', '=', 'users.id')
                ->select(
                    'registros_scrap_historial.id',
                    'registros_scrap_historial.registro_id',
                    'registros_scrap_historial.tipo_movimiento',
                    'registros_scrap_historial.campo_modificado',
                    'registros_scrap_historial.valor_anterior',
                    'registros_scrap_historial.valor_nuevo',
                    'registros_scrap_historial.observaciones',
                    'registros_scrap_historial.responsable',
                    'registros_scrap_historial.rol',
                    'registros_scrap_historial.created_at as fecha_modificacion',
                    DB::raw("'produccion' as origen"),
                    DB::raw("COALESCE(users.name, registros_scrap_historial.responsable) as responsable_nombre"),
                    'registros_scrap.area_real',
                    'registros_scrap.maquina_real'
                )
                ->whereBetween('registros_scrap_historial.created_at', [
                    $fechaInicio . ' 00:00:00', 
                    $fechaFin . ' 23:59:59'
                ])
                ->whereNotIn('registros_scrap_historial.tipo_movimiento', ['create']) // Excluir creación automática
                ->whereIn('registros_scrap_historial.tipo_movimiento', ['update', 'delete', 'suma', 'create_manual', 'batch_create']);
            
            if ($campo) {
                $queryProd->where('registros_scrap_historial.campo_modificado', 'like', "%{$campo}%");
            }
            
            if ($responsable) {
                $queryProd->where(function($q) use ($responsable) {
                    $q->where('registros_scrap_historial.responsable', 'like', "%{$responsable}%")
                      ->orWhere('users.name', 'like', "%{$responsable}%");
                });
            }
            
            $historial = $historial->concat($queryProd->orderBy('registros_scrap_historial.created_at', 'desc')->get());
        }
        
        if ($tipo === 'todos' || $tipo === 'recepcion') {
            $queryRecep = DB::table('recepciones_scrap_historial')
                ->join('recepciones_scrap', 'recepciones_scrap_historial.recepcion_id', '=', 'recepciones_scrap.id')
                ->leftJoin('users', 'recepciones_scrap.receptor_id', '=', 'users.id')
                ->select(
                    'recepciones_scrap_historial.id',
                    'recepciones_scrap_historial.recepcion_id as registro_id',
                    'recepciones_scrap_historial.tipo_movimiento',
                    'recepciones_scrap_historial.campo_modificado',
                    'recepciones_scrap_historial.valor_anterior',
                    'recepciones_scrap_historial.valor_nuevo',
                    'recepciones_scrap_historial.observaciones',
                    'recepciones_scrap_historial.responsable',
                    'recepciones_scrap_historial.rol',
                    'recepciones_scrap_historial.created_at as fecha_modificacion',
                    DB::raw("'recepcion' as origen"),
                    DB::raw("COALESCE(users.name, recepciones_scrap_historial.responsable) as responsable_nombre"),
                    'recepciones_scrap.tipo_material',
                    'recepciones_scrap.origen_especifico'
                )
                ->whereBetween('recepciones_scrap_historial.created_at', [
                    $fechaInicio . ' 00:00:00', 
                    $fechaFin . ' 23:59:59'
                ]);
            
            if ($campo) {
                $queryRecep->where('recepciones_scrap_historial.campo_modificado', 'like', "%{$campo}%");
            }
            
            if ($responsable) {
                $queryRecep->where(function($q) use ($responsable) {
                    $q->where('recepciones_scrap_historial.responsable', 'like', "%{$responsable}%")
                      ->orWhere('users.name', 'like', "%{$responsable}%");
                });
            }
            
            $historial = $historial->concat($queryRecep->orderBy('recepciones_scrap_historial.created_at', 'desc')->get());
        }
        
        return $historial;
    }

    public static function generarEstadisticasContraloria($movimientos)
    {
        $totalMovimientos = $movimientos->count();
        $totalPeso = $movimientos->sum('peso');
        
        $observacionesAnalizadas = $movimientos->map(function ($mov) {
            $parseadas = self::parsearObservacionesParaContraloria(
                $mov['observaciones'] ?? '', 
                $mov['origen'] === 'PLANTA' ? 'produccion' : 'recepcion'
            );
            
            return array_merge($mov, [
                'observaciones_parseadas' => $parseadas,
                'tiene_area' => !empty($parseadas['area']),
                'tiene_maquina' => !empty($parseadas['maquina']),
                'tiene_material_detalle' => !empty($parseadas['material']),
                'tiene_notas' => !empty($parseadas['notas'])
            ]);
        });
        
        $basculaCount = $observacionesAnalizadas->where('conexion_bascula', true)->count();
        $manualCount = $totalMovimientos - $basculaCount;
        
        $produccionCount = $observacionesAnalizadas->where('origen', 'PLANTA')->count();
        $recepcionCount = $observacionesAnalizadas->where('origen', 'EXTERNA')->count();
        
        $observacionesCompletas = $observacionesAnalizadas->where('tiene_area', true)
            ->where('tiene_maquina', true)
            ->where('tiene_material_detalle', true)
            ->count();
        
        $observacionesIncompletas = $totalMovimientos - $observacionesCompletas;
        
        $topAreas = $observacionesAnalizadas->filter(fn($m) => !empty($m['observaciones_parseadas']['area']))
            ->groupBy('observaciones_parseadas.area')
            ->map(function ($grupo, $area) {
                return [
                    'area' => $area,
                    'total_movimientos' => $grupo->count(),
                    'total_peso' => $grupo->sum('peso'),
                    'promedio_peso' => $grupo->avg('peso')
                ];
            })
            ->sortByDesc('total_movimientos')
            ->take(5)
            ->values();
        
        $topMaquinas = $observacionesAnalizadas->filter(fn($m) => !empty($m['observaciones_parseadas']['maquina']))
            ->groupBy('observaciones_parseadas.maquina')
            ->map(function ($grupo, $maquina) {
                return [
                    'maquina' => $maquina,
                    'total_movimientos' => $grupo->count(),
                    'total_peso' => $grupo->sum('peso'),
                    'promedio_peso' => $grupo->avg('peso')
                ];
            })
            ->sortByDesc('total_movimientos')
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
                'recepcion' => $recepcionCount,
                'porcentaje_produccion' => $totalMovimientos > 0 ? round(($produccionCount / $totalMovimientos) * 100, 1) : 0
            ],
            'observaciones' => [
                'completas' => $observacionesCompletas,
                'incompletas' => $observacionesIncompletas,
                'porcentaje_completas' => $totalMovimientos > 0 ? round(($observacionesCompletas / $totalMovimientos) * 100, 1) : 0,
                'con_area' => $observacionesAnalizadas->where('tiene_area', true)->count(),
                'con_maquina' => $observacionesAnalizadas->where('tiene_maquina', true)->count(),
                'con_material_detalle' => $observacionesAnalizadas->where('tiene_material_detalle', true)->count(),
                'con_notas' => $observacionesAnalizadas->where('tiene_notas', true)->count()
            ],
            'top_areas' => $topAreas,
            'top_maquinas' => $topMaquinas,
            'analisis_completitud' => [
                'areas' => $observacionesAnalizadas->pluck('observaciones_parseadas.area')->filter()->unique()->values(),
                'maquinas' => $observacionesAnalizadas->pluck('observaciones_parseadas.maquina')->filter()->unique()->values(),
                'materiales_detallados' => $observacionesAnalizadas->pluck('observaciones_parseadas.material')->filter()->unique()->values()
            ]
        ];
    }
}