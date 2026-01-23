<?php
/* app/Http/Controllers/DestinatariosController.php */

namespace App\Http\Controllers;

use App\Models\DestinatarioCorreo;
use Illuminate\Http\Request;

class DestinatariosController extends Controller
{
    public function index()
    {
        return response()->json(DestinatarioCorreo::orderBy('nombre')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'nombre' => 'required|string|max:255',
            'email' => 'required|email|unique:destinatarios_correos,email',
        ]);

        $destinatario = DestinatarioCorreo::create($validated);

        return response()->json([
            'message' => 'Destinatario agregado correctamente',
            'data' => $destinatario
        ], 201);
    }

    public function destroy($id)
    {
        $destinatario = DestinatarioCorreo::findOrFail($id);
        $destinatario->delete();

        return response()->json(['message' => 'Destinatario eliminado permanentemente']);
    }
}