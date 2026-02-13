<?php
// app/Http/Controllers/HistorialController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Services\HistorialService;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;

class HistorialController extends Controller
{
    public function registrarEdicion(Request $request)
    {
        try {
            $validated = $request->validate([
                'registro_id' => 'required|integer',
                'campo_modificado' => 'required|string',
                'valor_anterior' => 'nullable',
                'valor_nuevo' => 'nullable',
                'observaciones' => 'nullable|string'
            ]);

            $resultado = HistorialService::registrarEdicionManual(
                $validated['registro_id'],
                $validated['campo_modificado'],
                $validated['valor_anterior'],
                $validated['valor_nuevo'],
                $validated['observaciones'] ?? null
            );

            return response()->json([
                'success' => $resultado,
                'message' => $resultado ? 'Edición registrada en historial' : 'No se pudo registrar'
            ]);

        } catch (\Exception $e) {
            Log::error('Error en registrarEdicion: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar edición'
            ], 500);
        }
    }

    public function registrarSuma(Request $request)
    {
        try {
            $validated = $request->validate([
                'registro_id' => 'required|integer',
                'campo_modificado' => 'required|string',
                'valor_anterior' => 'nullable',
                'valor_nuevo' => 'nullable',
                'cantidad_sumada' => 'required|numeric'
            ]);

            $resultado = HistorialService::registrarSumaManual(
                $validated['registro_id'],
                $validated['campo_modificado'],
                $validated['valor_anterior'],
                $validated['valor_nuevo'],
                $validated['cantidad_sumada']
            );

            return response()->json([
                'success' => $resultado,
                'message' => $resultado ? 'Suma registrada en historial' : 'No se pudo registrar'
            ]);

        } catch (\Exception $e) {
            Log::error('Error en registrarSuma: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar suma'
            ], 500);
        }
    }

    public function registrarBorrado(Request $request)
    {
        try {
            $validated = $request->validate([
                'registro_id' => 'required|integer',
                'campo_modificado' => 'required|string',
                'valor_anterior' => 'nullable',
                'observaciones' => 'nullable|string'
            ]);

            $resultado = HistorialService::registrarBorrado(
                $validated['registro_id'],
                $validated['campo_modificado'],
                $validated['valor_anterior'],
                $validated['observaciones'] ?? null
            );

            return response()->json([
                'success' => $resultado,
                'message' => $resultado ? 'Borrado registrado en historial' : 'No se pudo registrar'
            ]);

        } catch (\Exception $e) {
            Log::error('Error en registrarBorrado: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Error al registrar borrado'
            ], 500);
        }
    }
}