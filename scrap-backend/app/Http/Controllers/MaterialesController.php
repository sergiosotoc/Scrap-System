<?php
/* app/Http/controllers/MaterialesController.php */
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\ConfigTipoScrap;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Log;

class MaterialesController extends Controller
{
    public function index()
    {
        return ConfigTipoScrap::orderBy('orden')->get();
    }

    public function getByUso($uso)
    {
        return ConfigTipoScrap::whereIn('uso', [$uso, 'ambos'])
            ->orderBy('orden')
            ->get();
    }

    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'tipo_nombre' => 'required|string|max:100|unique:config_tipos_scrap,tipo_nombre',
                'uso' => 'required|in:operador,receptor,ambos',
            ], [
                'tipo_nombre.unique' => 'Este material ya existe en el catálogo.',
                'tipo_nombre.required' => 'El nombre del material es obligatorio.'
            ]);

            $maxOrden = ConfigTipoScrap::max('orden') ?? 0;

            $columnaDb = ($validated['uso'] === 'operador' || $validated['uso'] === 'ambos') 
                ? Str::slug($validated['tipo_nombre'], '_') 
                : null;

            $material = ConfigTipoScrap::create([
                'tipo_nombre' => $validated['tipo_nombre'],
                'uso' => $validated['uso'],
                'columna_db' => $columnaDb, 
                'orden' => $maxOrden + 1,
            ]);

            return response()->json([
                'message' => 'Material agregado correctamente',
                'material' => $material
            ], 201);

        } catch (\Exception $e) {
            Log::error('Error creando material: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error al guardar el material: ' . $e->getMessage()
            ], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $material = ConfigTipoScrap::findOrFail($id);
            $material->delete();

            return response()->json(['message' => 'Material eliminado correctamente']);
        } catch (\Exception $e) {
            return response()->json(['message' => 'No se pudo eliminar el material'], 500);
        }
    }
}