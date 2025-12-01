<?php
/* app/Http/Controllers/RecepcionScrapController.php - VERSIÓN COMPLETA CORREGIDA */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RecepcionesScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;

class RecepcionScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RecepcionesScrap::with(['receptor']);

        // ✅ FILTROS SIMPLIFICADOS - Solo fecha (no rango)
        if ($request->has('fecha') && $request->fecha != '') {
            // Filtrar por un solo día
            $query->whereDate('fecha_entrada', $request->fecha);
        }

        if ($request->has('tipo_material') && $request->tipo_material != '') {
            $query->where('tipo_material', $request->tipo_material);
        }

        if ($request->has('origen_tipo') && $request->origen_tipo != '') {
            $query->where('origen_tipo', $request->origen_tipo);
        }

        if ($request->has('destino') && $request->destino != '') {
            $query->where('destino', $request->destino);
        }

        // Control de acceso por rol
        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        $recepciones = $query->orderBy('fecha_entrada', 'desc')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($recepciones);
    }

    // También actualiza el método stats() si lo usas
    public function stats(Request $request)
    {
        $user = Auth::user();

        $query = RecepcionesScrap::query();

        // ✅ FILTRO POR FECHA ÚNICA
        if ($request->has('fecha') && $request->fecha != '') {
            $query->whereDate('fecha_entrada', $request->fecha);
        }

        if ($request->has('tipo_material') && $request->tipo_material != '') {
            $query->where('tipo_material', $request->tipo_material);
        }

        if ($request->has('origen_tipo') && $request->origen_tipo != '') {
            $query->where('origen_tipo', $request->origen_tipo);
        }

        if ($request->has('destino') && $request->destino != '') {
            $query->where('destino', $request->destino);
        }

        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        $totalRecepciones = $query->count();
        $totalPeso = $query->sum('peso_kg');

        // Distribucion por destino
        $destinos = $query->clone()
            ->selectRaw('destino, COUNT(*) as count, SUM(peso_kg) as peso_total')
            ->groupBy('destino')
            ->get();

        // Distribucion por origen
        $origenes = $query->clone()
            ->selectRaw('origen_tipo, COUNT(*) as count, SUM(peso_kg) as peso_total')
            ->groupBy('origen_tipo')
            ->get();

        return response()->json([
            'total_recepciones' => $totalRecepciones,
            'total_peso_kg' => $totalPeso,
            'destinos' => $destinos,
            'origenes' => $origenes,
        ]);
    }

    public function store(Request $request)
    {
        // ✅ VALIDACIÓN ACTUALIZADA
        $validated = $request->validate([
            'peso_kg' => 'required|numeric|min:0.001',
            'tipo_material' => 'required|string|max:50',
            'origen_tipo' => 'required|in:interna,externa',
            'origen_especifico' => 'nullable|string|max:150',
            'destino' => 'required|in:almacenamiento,reciclaje,venta',
        ]);

        DB::beginTransaction();
        try {
            // Generar número HU único
            $numeroHU = 'HU-' . strtoupper(Str::random(3)) . '-' . date('Ymd') . '-' .
                str_pad(RecepcionesScrap::count() + 1, 3, '0', STR_PAD_LEFT);

            // ✅ SOLO los campos esenciales para la recepción
            $dataToInsert = [
                'numero_hu' => $numeroHU,
                'peso_kg' => $validated['peso_kg'],
                'tipo_material' => $validated['tipo_material'],
                'origen_tipo' => $validated['origen_tipo'],
                'origen_especifico' => $validated['origen_especifico'] ?? null,
                'receptor_id' => Auth::id(),
                'destino' => $validated['destino'],
                'impreso' => false,
                'fecha_entrada' => now(),
            ];

            $recepcion = RecepcionesScrap::create($dataToInsert);

            DB::commit();

            $recepcion->load('receptor');

            return response()->json([
                'success' => true,
                'message' => 'Recepción de scrap creada correctamente',
                'recepcion' => $recepcion,
                'numero_hu' => $numeroHU
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en RecepcionScrapController@store: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al crear recepción: ' . $e->getMessage()
            ], 500);
        }
    }

    public function tiposMaterial()
    {
        // Materiales comunes en recepciones de scrap
        $tiposComunes = [
            'cobre',
            'aluminio',
            'cobre_estanado',
            'cable_pvc',
            'cable_pe',
            'cable_xlpe',
            'purga_pvc',
            'purga_pe',
            'purga_pp',
            'chatarra_mixta',
            'cobre_brillante',
            'bronce',
            'latas_aluminio',
            'cable_trenzado',
            'cable_aluminio',
            'cobre_mixto'
        ];

        // También obtenemos los materiales ya usados en recepciones anteriores
        $materialesExistentes = RecepcionesScrap::distinct()
            ->whereNotNull('tipo_material')
            ->pluck('tipo_material')
            ->filter()
            ->unique()
            ->values()
            ->toArray();

        // Combinar y eliminar duplicados
        $todosLosMateriales = array_unique(array_merge($tiposComunes, $materialesExistentes));

        // Ordenar alfabéticamente
        sort($todosLosMateriales);

        return response()->json([
            'tipos' => $todosLosMateriales
        ]);
    }

    public function imprimirHU($id)
    {
        $recepcion = RecepcionesScrap::with(['receptor'])->findOrFail($id);

        $user = Auth::user();
        if ($user->role !== 'admin' && $recepcion->receptor_id !== $user->id) {
            return response()->json([
                'message' => 'No tienes permiso para ver esta recepción'
            ], 403);
        }

        // Aquí deberías generar el PDF usando tu librería preferida
        // Por ejemplo, usando DomPDF o TCPDF

        // Por ahora, solo marcamos como impreso
        $recepcion->marcarImpreso();

        return response()->json([
            'success' => true,
            'message' => 'Recepción marcada como impresa',
            'recepcion' => $recepcion,
            'download_url' => null // Para futura implementación PDF
        ]);
    }

    public function reporteRecepcion(Request $request)
    {
        $user = Auth::user();

        $query = RecepcionesScrap::with(['receptor']);

        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        // Filtros actualizados
        if ($request->has('fecha_desde') && $request->has('fecha_hasta')) {
            $query->whereBetween('fecha_entrada', [
                $request->fecha_desde,
                $request->fecha_hasta
            ]);
        }

        if ($request->has('tipo_material')) {
            $query->where('tipo_material', $request->tipo_material);
        }

        if ($request->has('origen_tipo')) {
            $query->where('origen_tipo', $request->origen_tipo);
        }

        if ($request->has('destino')) {
            $query->where('destino', $request->destino);
        }

        $recepciones = $query->orderBy('fecha_entrada', 'desc')->get();

        // Totales
        $totales = [
            'total_recepciones' => $recepciones->count(),
            'total_peso' => $recepciones->sum('peso_kg'),
            'por_destino' => $recepciones->groupBy('destino')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'peso_total' => $group->sum('peso_kg')
                ];
            }),
            'por_material' => $recepciones->groupBy('tipo_material')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'peso_total' => $group->sum('peso_kg')
                ];
            }),
            'por_origen' => $recepciones->groupBy('origen_tipo')->map(function ($group) {
                return [
                    'count' => $group->count(),
                    'peso_total' => $group->sum('peso_kg')
                ];
            })
        ];

        return response()->json([
            'recepciones' => $recepciones,
            'totales' => $totales,
            'filtros' => $request->all()
        ]);
    }

    public function show($id)
    {
        $recepcion = RecepcionesScrap::with(['receptor'])->findOrFail($id);

        $user = Auth::user();
        if ($user->role !== 'admin' && $recepcion->receptor_id !== $user->id) {
            return response()->json([
                'message' => 'No tienes permiso para ver esta recepción'
            ], 403);
        }

        return response()->json($recepcion);
    }

    public function registrosPendientes()
    {
        $user = Auth::user();

        $query = RecepcionesScrap::where('impreso', false);

        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        $pendientes = $query->orderBy('fecha_entrada', 'desc')
            ->limit(10)
            ->get();

        return response()->json($pendientes);
    }
}
