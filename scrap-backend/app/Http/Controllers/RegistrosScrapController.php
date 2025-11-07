<?php
// app/Http/Controllers/RegistrosScrapController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\ConfigAreaMaquina;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Log;

class RegistrosScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RegistrosScrap::with('operador');

        // Filtros
        if ($request->has('area')) {
            $query->where('area_real', $request->area);
        }

        if ($request->has('turno')) {
            $query->where('turno', $request->turno);
        }

        if ($request->has('fecha')) {
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
            'turnos' => [1, 2, 3],
            'config_bascula' => $this->obtenerConfigBascula()
        ]);
    }

    private function obtenerConfigBascula()
    {
        if (\Illuminate\Support\Facades\Storage::exists('bascula_config.json')) {
            return json_decode(\Illuminate\Support\Facades\Storage::get('bascula_config.json'), true);
        }
        
        return null;
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'turno' => 'required|in:1,2,3',
            'area_real' => 'required|string|max:100',
            'maquina_real' => 'required|string|max:100',
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

        DB::beginTransaction();
        try {
            // Calcular total
            $pesoTotal = array_sum([
                $validated['peso_cobre_estanado'] ?? 0,
                $validated['peso_purga_pvc'] ?? 0,
                $validated['peso_purga_pe'] ?? 0,
                $validated['peso_purga_pur'] ?? 0,
                $validated['peso_purga_pp'] ?? 0,
                $validated['peso_cable_pvc'] ?? 0,
                $validated['peso_cable_pe'] ?? 0,
                $validated['peso_cable_pur'] ?? 0,
                $validated['peso_cable_pp'] ?? 0,
                $validated['peso_cable_aluminio'] ?? 0,
                $validated['peso_cable_estanado_pvc'] ?? 0,
                $validated['peso_cable_estanado_pe'] ?? 0
            ]);

            $registro = RegistrosScrap::create([
                'operador_id' => Auth::user()->id,
                'turno' => $validated['turno'],
                'area_real' => $validated['area_real'],
                'maquina_real' => $validated['maquina_real'],
                'tipo_material' => 'mixto',
                'tipo_scrap_detallado' => 'registro_completo',
                'peso_cobre_estanado' => $validated['peso_cobre_estanado'] ?? 0,
                'peso_purga_pvc' => $validated['peso_purga_pvc'] ?? 0,
                'peso_purga_pe' => $validated['peso_purga_pe'] ?? 0,
                'peso_purga_pur' => $validated['peso_purga_pur'] ?? 0,
                'peso_purga_pp' => $validated['peso_purga_pp'] ?? 0,
                'peso_cable_pvc' => $validated['peso_cable_pvc'] ?? 0,
                'peso_cable_pe' => $validated['peso_cable_pe'] ?? 0,
                'peso_cable_pur' => $validated['peso_cable_pur'] ?? 0,
                'peso_cable_pp' => $validated['peso_cable_pp'] ?? 0,
                'peso_cable_aluminio' => $validated['peso_cable_aluminio'] ?? 0,
                'peso_cable_estanado_pvc' => $validated['peso_cable_estanado_pvc'] ?? 0,
                'peso_cable_estanado_pe' => $validated['peso_cable_estanado_pe'] ?? 0,
                'peso_total' => $pesoTotal,
                'estado' => 'pendiente',
                'completo' => true,
                'conexion_bascula' => $validated['conexion_bascula'] ?? false,
                'numero_lote' => $validated['numero_lote'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_registro' => now(),
            ]);

            DB::commit();

            // Solo generar PDF localmente, sin enviar por correo
            $this->generarReportePDF($registro);

            return response()->json([
                'message' => 'Registro de scrap creado correctamente',
                'registro' => $registro->load('operador'),
                'peso_total' => $pesoTotal,
                'reporte_generado' => true
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Error al crear registro: ' . $e->getMessage()
            ], 500);
        }
    }

    private function generarReportePDF(RegistrosScrap $registro)
    {
        try {
            // Generar PDF solo para descarga local
            $pdf = PDF::loadView('pdf.registro-scrap', compact('registro'));
            $fileName = "registro_scrap_{$registro->id}_{$registro->fecha_registro->format('Ymd_His')}.pdf";
            $pdfPath = storage_path("app/pdf/{$fileName}");
            
            // Asegurar que existe el directorio
            if (!file_exists(dirname($pdfPath))) {
                mkdir(dirname($pdfPath), 0755, true);
            }
            
            // Guardar PDF localmente
            $pdf->save($pdfPath);

            Log::info("PDF generado localmente para registro {$registro->id}: {$pdfPath}");

            return true;

        } catch (\Exception $e) {
            Log::error('Error generando reporte PDF: ' . $e->getMessage());
            return false;
        }
    }

    public function generarReporteDiario(Request $request)
    {
        $validated = $request->validate([
            'fecha' => 'required|date',
            'turno' => 'nullable|in:1,2,3'
        ]);

        $user = Auth::user();
        $fecha = $validated['fecha'];
        $turno = $validated['turno'] ?? null;

        $query = RegistrosScrap::with('operador')
            ->whereDate('fecha_registro', $fecha)
            ->where('completo', true);

        if ($turno) {
            $query->where('turno', $turno);
        }

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->get();

        // Agrupar como en el PDF original
        $agrupado = $this->agruparRegistrosComoPDF($registros);
        $totales = $this->calcularTotales($registros);

        // Generar PDF para descarga
        $pdf = PDF::loadView('pdf.reporte-diario', [
            'registros' => $registros,
            'agrupado' => $agrupado,
            'totales' => $totales,
            'fecha' => $fecha,
            'turno' => $turno,
            'user' => $user
        ]);

        return $pdf->download("reporte_diario_{$fecha}.pdf");
    }

    private function agruparRegistrosComoPDF($registros)
    {
        $agrupado = [];
        
        // Agrupar por área y máquina como en el PDF original
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
        
        return $agrupado;
    }

    private function calcularTotales($registros)
    {
        return [
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
    }

    public function reportesAcumulados(Request $request)
    {
        $user = Auth::user();
        $fecha = $request->fecha ?? now()->format('Y-m-d');
        $turno = $request->turno;

        $query = RegistrosScrap::whereDate('fecha_registro', $fecha)
            ->where('completo', true);

        if ($turno) {
            $query->where('turno', $turno);
        }

        if ($user->role !== 'admin') {
            $query->where('operador_id', $user->id);
        }

        $registros = $query->get();

        // Agrupar por área y máquina como en el PDF
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
            $pendientes = RegistrosScrap::where('estado', 'pendiente')->count();
            $conBascula = RegistrosScrap::where('conexion_bascula', true)->count();
            
            // Totales por área
            $porArea = RegistrosScrap::select('area_real', DB::raw('SUM(peso_total) as total_kg'))
                ->groupBy('area_real')
                ->get();
        } else {
            $totalRegistros = RegistrosScrap::where('operador_id', $user->id)->count();
            $totalPeso = RegistrosScrap::where('operador_id', $user->id)->sum('peso_total');
            $pendientes = RegistrosScrap::where('operador_id', $user->id)
                ->where('estado', 'pendiente')
                ->count();
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
            'pendientes' => $pendientes,
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
        try {
            // Simulación de conexión con báscula
            $peso = $request->peso_manual ?? $this->simularLecturaBascula();
            
            return response()->json([
                'success' => true,
                'peso_kg' => $peso,
                'mensaje' => 'Báscula conectada correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'mensaje' => 'Error al conectar con báscula: ' . $e->getMessage()
            ], 500);
        }
    }

    private function simularLecturaBascula()
    {
        // Simula lectura de báscula entre 0.5 y 50 kg
        return round(mt_rand(50, 5000) / 100, 2);
    }
}