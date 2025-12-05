<?php
/* app/Http/Controllers/RecepcionScrapController.php */
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RecepcionesScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class RecepcionScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RecepcionesScrap::with(['receptor']); 

        // Filtros
        if ($request->has('origen_tipo') && $request->origen_tipo != '') {
            $query->where('origen_tipo', $request->origen_tipo);
        }

        if ($request->has('destino') && $request->destino != '') {
            $query->where('destino', $request->destino);
        }

        if (
            $request->has('fecha_inicio') && $request->has('fecha_fin') &&
            $request->fecha_inicio != '' && $request->fecha_fin != ''
        ) {
            $query->whereBetween('fecha_entrada', [
                $request->fecha_inicio,
                $request->fecha_fin
            ]);
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'peso_kg' => 'required|numeric|min:0.1',
            'tipo_material' => 'required|string|max:50',
            'origen_tipo' => 'required|in:interna,externa',
            'origen_especifico' => 'required_if:origen_tipo,externa|nullable|string|max:150',
            'destino' => 'required|in:reciclaje,venta,almacenamiento',
            'observaciones' => 'nullable|string',
            'lugar_almacenamiento' => 'nullable|string|max:100'
        ]);

        DB::beginTransaction();
        try {
            // --- GENERACIÓN DE HU EXACTA (AAMMDD + 4 dígitos) ---
            // Ejemplo: 2512059844 (Año 25, Mes 12, Día 05, Random 9844)
            $fecha = date('ymd'); // 6 dígitos
            $random = rand(1000, 9999); // 4 dígitos
            $numeroHU = $fecha . $random;

            // Verificamos colisión para garantizar unicidad
            while(RecepcionesScrap::where('numero_hu', $numeroHU)->exists()){
                $random = rand(1000, 9999);
                $numeroHU = $fecha . $random;
            }

            $dataToInsert = [
                'numero_hu' => $numeroHU,
                'peso_kg' => $validated['peso_kg'],
                'tipo_material' => $validated['tipo_material'],
                'origen_tipo' => $validated['origen_tipo'],
                'origen_especifico' => $validated['origen_especifico'] ?? null,
                'receptor_id' => Auth::id(),
                'destino' => $validated['destino'],
                'lugar_almacenamiento' => $validated['lugar_almacenamiento'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_entrada' => now(),
                'fecha_registro' => now(), 
            ];

            $recepcion = RecepcionesScrap::create($dataToInsert);

            DB::commit();

            $recepcion->load('receptor');

            return response()->json([
                'message' => 'Recepción de scrap creada correctamente',
                'recepcion' => $recepcion,
                'numero_hu' => $numeroHU
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error en RecepcionScrapController@store: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error interno del servidor: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reporteRecepcion(Request $request)
    {
        $user = Auth::user();

        $query = RecepcionesScrap::with(['receptor']); 

        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        if ($request->has('fecha_inicio') && $request->has('fecha_fin')) {
            $query->whereBetween('fecha_entrada', [
                $request->fecha_inicio,
                $request->fecha_fin
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
                'message' => 'No tienes permiso para ver esta recepcion'
            ], 403);
        }

        return response()->json($recepcion);
    }
}