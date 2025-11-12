<?php
// app/Http/Controllers/RecepcionScrapController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RecepcionesScrap;
use App\Models\RegistrosScrap;
use App\Models\StockScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Validation\Rule;

class RecepcionScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RecepcionesScrap::with(['receptor', 'registro.operador']);

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

        // Log para debug
        \Log::info('Recepciones cargadas para usuario ' . $user->id . ': ' . $recepciones->count());

        return response()->json($recepciones);
    }

    public function registrosPendientes()
    {
        $registros = RegistrosScrap::with('operador')
            ->where('estado', 'pendiente')
            ->where('completo', true)
            ->orderBy('fecha_registro', 'asc')
            ->orderBy('created_at', 'asc')
            ->get();

        return response()->json($registros);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'peso_kg' => 'required|numeric|min:0.1',
            'tipo_material' => 'required|string|max:50',
            'origen_tipo' => 'required|in:interna,externa',
            'origen_especifico' => 'required|string|max:150',
            'destino' => 'required|in:reciclaje,venta,almacenamiento',
            'observaciones' => 'nullable|string',
            // **CORRECCIÓN:** Validación de registro_scrap_id con condición de estado 'pendiente'
            'registro_scrap_id' => [
                'nullable',
                // Valida que el ID exista y que su estado sea 'pendiente' si el ID está presente
                Rule::exists('registros_scrap', 'id')->where(function ($query) use ($request) {
                    if ($request->input('registro_scrap_id')) {
                        $query->where('estado', 'pendiente');
                    }
                }),
                // Hace el campo requerido si el origen es 'interna' para asegurar trazabilidad
                Rule::requiredIf($request->input('origen_tipo') === 'interna')
            ],
            'lugar_almacenamiento' => 'required_if:destino,almacenamiento|string|max:100'
        ]);

        DB::beginTransaction();
        try {
            $numeroHU = 'HU-' . strtoupper(Str::random(3)) . '-' . date('Ymd-His');

            $dataToInsert = [
                'numero_hu' => $numeroHU,
                'peso_kg' => $validated['peso_kg'],
                'tipo_material' => $validated['tipo_material'],
                'origen_tipo' => $validated['origen_tipo'],
                'origen_especifico' => $validated['origen_especifico'],
                'registro_scrap_id' => $validated['registro_scrap_id'] ?? null,
                'receptor_id' => Auth::id(),
                'destino' => $validated['destino'],
                'lugar_almacenamiento' => $validated['lugar_almacenamiento'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_entrada' => now(),
                'fecha_registro' => now(),
            ];

            $recepcion = RecepcionesScrap::create($dataToInsert);

            // Actualizar el estado del registro original SOLO si es origen interno y tiene registro
            if ($validated['origen_tipo'] === 'interna' && isset($validated['registro_scrap_id'])) {
                $registro = RegistrosScrap::find($validated['registro_scrap_id']);
                if ($registro) {
                    $registro->marcarRecibido();
                }
            }

            // **CORRECCIÓN LÓGICA DE STOCK:** Crear una nueva entrada de StockScrap (lote/HU)
            if ($validated['destino'] === 'almacenamiento') {
                StockScrap::crearNuevoLote(
                    $validated['tipo_material'],
                    $validated['peso_kg'],
                    $validated['lugar_almacenamiento'],
                    $numeroHU,
                    $validated['origen_tipo'],
                    $validated['origen_especifico'],
                    $recepcion->id
                );
            }

            DB::commit();

            $recepcion->load(['receptor', 'registro.operador']);

            return response()->json([
                'message' => 'Recepción de scrap creada correctamente',
                'recepcion' => $recepcion,
                'numero_hu' => $numeroHU
            ], 201);
        } catch (\Exception $e) {
            DB::rollBack();
            \Log::error('Error en RecepcionScrapController@store: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error interno del servidor: ' . $e->getMessage()
            ], 500);
        }
    }

    public function imprimirHU($id)
    {
        $recepcion = RecepcionesScrap::with(['receptor', 'registro.operador'])->findOrFail($id);

        // Verificar permisos
        $user = Auth::user();
        if ($user->role !== 'admin' && $recepcion->receptor_id !== $user->id) {
            return response()->json([
                'message' => 'No tienes permiso para imprimir esta HU'
            ], 403);
        }

        try {
            // Generar PDF
            $pdf = PDF::loadView('pdf.hu', compact('recepcion'));

            // Marcar como impreso
            $recepcion->marcarImpreso();

            // Devolver el PDF como descarga
            return $pdf->download("HU-{$recepcion->numero_hu}.pdf");
        } catch (\Exception $e) {
            \Log::error('Error generando PDF para HU ' . $id . ': ' . $e->getMessage());

            return response()->json([
                'message' => 'Error al generar el PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    public function reporteRecepcion(Request $request)
    {
        $user = Auth::user();

        $query = RecepcionesScrap::with(['receptor', 'registro.operador']);

        if ($user->role !== 'admin') {
            $query->where('receptor_id', $user->id);
        }

        // Filtros
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

    public function stockDisponible()
    {
        $stock = StockScrap::disponible()
            ->selectRaw('tipo_material, SUM(cantidad_kg) as cantidad_total, COUNT(*) as numero_lotes')
            ->groupBy('tipo_material')
            ->get();

        return response()->json($stock);
    }

    public function stats()
    {
        $user = Auth::user();

        if ($user->role === 'admin') {
            $totalRecepciones = RecepcionesScrap::count();
            $totalPeso = RecepcionesScrap::sum('peso_kg');
            $registrosPendientes = RegistrosScrap::where('estado', 'pendiente')->count();
        } else {
            $totalRecepciones = RecepcionesScrap::where('receptor_id', $user->id)->count();
            $totalPeso = RecepcionesScrap::where('receptor_id', $user->id)->sum('peso_kg');
            $registrosPendientes = RegistrosScrap::where('estado', 'pendiente')->count();
        }

        // Distribucion por destino
        $destinos = RecepcionesScrap::when($user->role !== 'admin', function ($query) use ($user) {
            return $query->where('receptor_id', $user->id);
        })
            ->selectRaw('destino, COUNT(*) as count, SUM(peso_kg) as peso_total')
            ->groupBy('destino')
            ->get();

        return response()->json([
            'total_recepciones' => $totalRecepciones,
            'total_peso_kg' => $totalPeso,
            'registros_pendientes' => $registrosPendientes,
            'destinos' => $destinos,
        ]);
    }

    public function show($id)
    {
        $recepcion = RecepcionesScrap::with(['receptor', 'registro.operador'])->findOrFail($id);

        $user = Auth::user();
        if ($user->role !== 'admin' && $recepcion->receptor_id !== $user->id) {
            return response()->json([
                'message' => 'No tienes permiso para ver esta recepcion'
            ], 403);
        }

        return response()->json($recepcion);
    }
}
