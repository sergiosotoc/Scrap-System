<?php
/* app/Http/Controllers/RecepcionScrapController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RecepcionScrap;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use App\Services\HistorialService;

class RecepcionScrapController extends Controller
{
    public function index(Request $request)
    {
        $user = Auth::user();
        $query = RecepcionScrap::with(['receptor', 'tipoScrap']);

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
            'tipo_scrap_id' => 'required|exists:config_tipos_scrap,id',
            'tipo_material' => 'required|string',
            'origen_tipo' => 'required|in:interna,externa',
            'origen_especifico' => 'required_if:origen_tipo,externa|nullable|string|max:150',
            'destino' => 'required|in:reciclaje,venta,almacenamiento',
            'observaciones' => 'nullable|string',
            'lugar_almacenamiento' => 'nullable|string|max:100'
        ]);

        DB::beginTransaction();
        try {
            $tipoScrap = ConfigTipoScrap::where('tipo_nombre', $validated['tipo_material'])->first();

            $tipoScrapId = null;
            if ($tipoScrap) {
                $tipoScrapId = $tipoScrap->id;
            } else {
                $tipoPredeterminado = ConfigTipoScrap::where('es_predeterminado', true)->first();
                if ($tipoPredeterminado) {
                    $tipoScrapId = $tipoPredeterminado->id;
                }
            }

            $fechaPrefix = date('ymd');

            $numerosExistentes = RecepcionScrap::where('numero_hu', 'like', $fechaPrefix . '%')
                ->lockForUpdate()
                ->pluck('numero_hu')
                ->map(function ($hu) use ($fechaPrefix) {
                    return intval(substr($hu, strlen($fechaPrefix)));
                })
                ->toArray();

            $nuevaSecuencia = 1;
            while (in_array($nuevaSecuencia, $numerosExistentes)) {
                $nuevaSecuencia++;
            }

            $secuenciaStr = str_pad($nuevaSecuencia, 3, '0', STR_PAD_LEFT);
            $numeroHU = $fechaPrefix . $secuenciaStr;

            $dataToInsert = [
                'numero_hu' => $numeroHU,
                'peso_kg' => $validated['peso_kg'],
                'tipo_material' => $validated['tipo_material'],
                'tipo_scrap_id' => $validated['tipo_scrap_id'],
                'origen_tipo' => $validated['origen_tipo'],
                'origen_especifico' => $validated['origen_especifico'] ?? null,
                'receptor_id' => Auth::id(),
                'destino' => $validated['destino'],
                'lugar_almacenamiento' => $validated['lugar_almacenamiento'] ?? null,
                'observaciones' => $validated['observaciones'] ?? null,
                'fecha_entrada' => now(),
            ];

            $recepcion = RecepcionScrap::create($dataToInsert);

            HistorialService::registrarHistorialRecepcion(
                $recepcion->id,
                'create',
                'recepcion_completa',
                null,
                'Recepción creada',
                $validated['observaciones'] ?? 'Recepción estándar'
            );

            DB::commit();

            $recepcion->load(['receptor', 'tipoScrap']);

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

    public function update(Request $request, $id)
    {
        $validated = $request->validate([
            'destino' => 'required|in:reciclaje,venta,almacenamiento',
        ]);

        try {
            $recepcion = RecepcionScrap::findOrFail($id);

            $user = Auth::user();
            if ($user->role !== 'admin' && $recepcion->receptor_id !== $user->id) {
                return response()->json([
                    'message' => 'No tienes permiso para modificar este registro'
                ], 403);
            }

            $valorAnterior = $recepcion->destino;
            
            $recepcion->destino = $validated['destino'];
            $recepcion->save();

            HistorialService::registrarHistorialRecepcion(
                $recepcion->id,
                'update',
                'destino',
                $valorAnterior,
                $validated['destino'],
                "Destino actualizado de '{$valorAnterior}' a '{$validated['destino']}'"
            );

            $recepcion->load(['receptor', 'tipoScrap']);

            return response()->json([
                'message' => 'Destino actualizado correctamente',
                'data' => $recepcion
            ], 200);
        } catch (\Illuminate\Database\Eloquent\ModelNotFoundException $e) {
            return response()->json(['message' => 'Recepción no encontrada'], 404);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 500);
        }
    }
}