<?php
/* app/Http/Controllers/AreasMaquinasController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConfigAreaMaquina;
use Illuminate\Validation\Rule;

class AreasMaquinasController extends Controller
{
    public function index()
    {
        return ConfigAreaMaquina::with('materialesPermitidos')
        ->orderBy('area_nombre')
        ->orderBy('orden')
        ->get();
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'area_nombre' => 'required|string|max:100',
            'maquina_nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('config_areas_maquinas')->where(function ($query) use ($request) {
                    return $query->where('area_nombre', $request->area_nombre);
                })
            ]
        ], [
            'maquina_nombre.unique' => 'Esta máquina ya existe en el área seleccionada.'
        ]);

        $ultimoOrden = ConfigAreaMaquina::where('area_nombre', $validated['area_nombre'])
            ->max('orden');

        $areaMaquina = ConfigAreaMaquina::create([
            'area_nombre' => strtoupper($validated['area_nombre']),
            'maquina_nombre' => strtoupper($validated['maquina_nombre']),
            'orden' => $ultimoOrden ? $ultimoOrden + 1 : 1,
            'activa' => true
        ]);

        return response()->json([
            'message' => 'Configuración agregada correctamente',
            'data' => $areaMaquina
        ], 201);
    }

    public function destroy($id)
    {
        $config = ConfigAreaMaquina::findOrFail($id);
        $config->delete();

        return response()->json(['message' => 'Máquina eliminada del área correctamente']);
    }

    public function syncMateriales(Request $request, $id)
    {
        $validated = $request->validate([
            'materiales_ids' => 'present|array',
            'materiales_ids.*' => 'exists:config_tipos_scrap,id'
        ]);

        try {
            $maquina = ConfigAreaMaquina::findOrFail($id);
            $maquina->materialesPermitidos()->sync($validated['materiales_ids']);

            return response()->json([
                'success' => true,
                'message' => 'Materiales actualizados correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error al actualizar: ' . $e->getMessage()
            ], 500);
        }
    }

    public function syncMaterialesPorArea(Request $request)
    {
        $validated = $request->validate([
            'area_nombre' => 'required|string',
            'materiales_ids' => 'present|array',
            'materiales_ids.*' => 'exists:config_tipos_scrap,id'
        ]);

        try {
            // Buscamos todas las máquinas que pertenecen a esa área
            $maquinas = ConfigAreaMaquina::where('area_nombre', $validated['area_nombre'])->get();

            foreach ($maquinas as $maquina) {
                // Sincronizamos cada máquina con la misma lista de materiales
                $maquina->materialesPermitidos()->sync($validated['materiales_ids']);
            }

            return response()->json([
                'success' => true,
                'message' => "Materiales actualizados para todas las máquinas de " . $validated['area_nombre']
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
