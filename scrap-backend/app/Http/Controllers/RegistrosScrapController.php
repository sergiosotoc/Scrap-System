<?php
/* app/Http/Controllers/RegistrosScrapController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\ConfigAreaMaquina;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RegistrosScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RegistrosScrap::with('operador');

        // Filtros
        if ($request->has('area') && $request->area != '') {
            $query->where('area_real', $request->area);
        }

        if ($request->has('turno') && $request->turno != '') {
            $query->where('turno', $request->turno);
        }

        if ($request->has('fecha') && $request->fecha != '') {
            $query->whereDate('fecha_registro', $request->fecha);
        }

        // Control de acceso por rol
        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->orderBy('fecha_registro', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($registros);
    }

    public function getConfiguracion()
    {
        $areasMaquinas = ConfigAreaMaquina::activas()
            ->orderBy('orden')
            ->get()
            ->groupBy('area_nombre');

        $tiposScrap = ConfigTipoScrap::activos()
            ->orderBy('orden')
            ->get()
            ->groupBy('categoria');

        return response()->json([
            'areas_maquinas' => $areasMaquinas,
            'tipos_scrap' => $tiposScrap,
            'turnos' => [1, 2, 3]
        ]);
    }

    public function store(Request $request)
    {
        Log::info('📥 Datos recibidos en store:', $request->all());

        // 1. Validación MEJORADA
        $validated = $request->validate([
            'turno' => 'required|in:1,2,3',
            'area_real' => 'required|string|max:100',
            'maquina_real' => 'required|string|max:100',
            'material_seleccionado' => 'required|string',
            'peso_actual' => 'nullable|numeric|min:0',

            // Validar que sean números (pueden ser nulos)
            'peso_cobre' => 'nullable|numeric|min:0',
            'peso_cobre_estanado' => 'nullable|numeric|min:0',
            'peso_purga_pvc' => 'nullable|numeric|min:0',
            'peso_purga_pe' => 'nullable|numeric|min:0',
            'peso_purga_pur' => 'nullable|numeric|min:0',
            'peso_purga_pp' => 'nullable|numeric|min:0',
            'peso_cable_pvc' => 'nullable|numeric|min:0',
            'peso_cable_pe' => 'nullable|numeric|min:0',
            'peso_cable_pur' => 'nullable|numeric|min:0',
            'peso_cable_pp' => 'nullable|numeric|min:0',
            'peso_cable_aluminio' => 'nullable|numeric|min:0',
            'peso_cable_estanado_pvc' => 'nullable|numeric|min:0',
            'peso_cable_estanado_pe' => 'nullable|numeric|min:0',

            'conexion_bascula' => 'boolean',
            'numero_lote' => 'nullable|string|max:50',
            'observaciones' => 'nullable|string'
        ]);

        Log::info('✅ Datos validados:', $validated);

        DB::beginTransaction();
        try {
            // 2. Mapeo de materiales a campos de base de datos
            $mapeoMateriales = [
                'cobre' => 'peso_cobre',
                'cobre_estanado' => 'peso_cobre_estanado',
                'purga_pvc' => 'peso_purga_pvc',
                'purga_pe' => 'peso_purga_pe',
                'purga_pur' => 'peso_purga_pur',
                'purga_pp' => 'peso_purga_pp',
                'cable_pvc' => 'peso_cable_pvc',
                'cable_pe' => 'peso_cable_pe',
                'cable_pur' => 'peso_cable_pur',
                'cable_pp' => 'peso_cable_pp',
                'cable_aluminio' => 'peso_cable_aluminio',
                'cable_estanado_pvc' => 'peso_cable_estanado_pvc',
                'cable_estanado_pe' => 'peso_cable_estanado_pe'
            ];

            // 3. Preparar datos para guardar
            $pesoTotal = 0;
            $datosGuardar = [
                'operador_id' => Auth::id(),
                'turno' => $validated['turno'],
                'area_real' => $validated['area_real'],
                'maquina_real' => $validated['maquina_real'],
                'conexion_bascula' => $validated['conexion_bascula'] ?? false,
                'numero_lote' => $validated['numero_lote'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_registro' => now(),
            ];

            // 4. Asignar valores y calcular total
            foreach ($mapeoMateriales as $material => $campoDb) {
                // Si es el material seleccionado y tenemos peso actual, usar ese peso
                if ($material === $validated['material_seleccionado'] && isset($validated['peso_actual'])) {
                    $valor = $validated['peso_actual'];
                    Log::info("🎯 Actualizando material seleccionado: {$material} con peso: {$valor}");
                } else {
                    $valor = $validated[$campoDb] ?? 0;
                }

                $datosGuardar[$campoDb] = $valor;
                $pesoTotal += $valor;
            }

            $datosGuardar['peso_total'] = $pesoTotal;

            Log::info('💾 Datos a guardar en BD:', $datosGuardar);

            // 5. Crear el registro
            $registro = RegistrosScrap::create($datosGuardar);

            DB::commit();

            Log::info('✅ Registro creado exitosamente ID: ' . $registro->id);

            return response()->json([
                'message' => 'Registro de scrap guardado exitosamente',
                'registro' => $registro->load('operador'),
                'peso_total' => $pesoTotal,
                'material_actualizado' => $validated['material_seleccionado']
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('❌ Error creando registro scrap: ' . $e->getMessage());
            Log::error('📋 Stack trace: ' . $e->getTraceAsString());
            return response()->json([
                'message' => 'Error interno al guardar: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reportesAcumulados(Request $request)
    {
        $user = Auth::user();
        $fecha = $request->fecha ?? now()->format('Y-m-d');
        $turno = $request->turno;

        $query = RegistrosScrap::whereDate('fecha_registro', $fecha);

        if ($turno) {
            $query->where('turno', $turno);
        }

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->get();

        // Agrupar por área y máquina
        $agrupado = [];
        foreach ($registros->groupBy(['area_real', 'maquina_real']) as $area => $maquinas) {
            foreach ($maquinas as $maquina => $items) {
                $agrupado[] = [
                    'area' => $area,
                    'maquina' => $maquina,
                    'total_kg' => $items->sum('peso_total'),
                    'registros' => $items->count(),
                    'detalles' => $items
                ];
            }
        }

        // Calcular totales por tipo de scrap
        $totales = [
            'peso_cobre_estanado' => $registros->sum('peso_cobre_estanado'),
            'peso_purga_pvc' => $registros->sum('peso_purga_pvc'),
            'peso_purga_pe' => $registros->sum('peso_purga_pe'),
            'peso_purga_pur' => $registros->sum('peso_purga_pur'),
            'peso_purga_pp' => $registros->sum('peso_purga_pp'),
            'peso_cable_pvc' => $registros->sum('peso_cable_pvc'),
            'peso_cable_pe' => $registros->sum('peso_cable_pe'),
            'peso_cable_pur' => $registros->sum('peso_cable_pur'),
            'peso_cable_pp' => $registros->sum('peso_cable_pp'),
            'peso_cable_aluminio' => $registros->sum('peso_cable_aluminio'),
            'peso_cable_estanado_pvc' => $registros->sum('peso_cable_estanado_pvc'),
            'peso_cable_estanado_pe' => $registros->sum('peso_cable_estanado_pe'),
            'peso_total_general' => $registros->sum('peso_total'),
        ];

        return response()->json([
            'fecha' => $fecha,
            'turno' => $turno,
            'agrupado' => $agrupado,
            'totales' => $totales,
            'total_registros' => $registros->count()
        ]);
    }

    public function stats()
    {
        $user = Auth::user();

        if ($user->role === 'admin') {
            $totalRegistros = RegistrosScrap::count();
            $totalPeso = RegistrosScrap::sum('peso_total');
            $conBascula = RegistrosScrap::where('conexion_bascula', true)->count();

            // Totales por área
            $porArea = RegistrosScrap::select('area_real', DB::raw('SUM(peso_total) as total_kg'))
                ->groupBy('area_real')
                ->get();
        } else {
            $totalRegistros = RegistrosScrap::where('operador_id', $user->id)->count();
            $totalPeso = RegistrosScrap::where('operador_id', $user->id)->sum('peso_total');
            $conBascula = RegistrosScrap::where('operador_id', $user->id)
                ->where('conexion_bascula', true)
                ->count();

            $porArea = RegistrosScrap::select('area_real', DB::raw('SUM(peso_total) as total_kg'))
                ->where('operador_id', $user->id)
                ->groupBy('area_real')
                ->get();
        }

        return response()->json([
            'total_registros' => $totalRegistros,
            'total_peso_kg' => $totalPeso,
            'registros_bascula' => $conBascula,
            'por_area' => $porArea,
        ]);
    }

    public function show($id)
    {
        $registro = RegistrosScrap::with('operador')->findOrFail($id);

        $user = Auth::user();
        if ($user->role !== 'admin' && $registro->operador_id !== $user->id) {
            return response()->json([
                'message' => 'No tienes permiso para ver este registro'
            ], 403);
        }

        return response()->json($registro);
    }

    public function conectarBascula(Request $request)
    {
        $basculaController = new BasculaController();
        return $basculaController->leerPeso($request);
    }
}