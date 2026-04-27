<?php
// app/Http/Controllers/DraftController.php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Storage;

class DraftController extends Controller
{
    private function getDraftPath(Request $request): string
    {
        $userId = Auth::id();
        $turno  = $request->input('turno', 'sin-turno');
        $fecha  = $request->input('fecha', now()->toDateString());
        
        // drafts/draft_userId_fecha_turno.json
        return "drafts/draft_{$userId}_{$fecha}_t{$turno}.json";
    }

    public function save(Request $request)
    {
        try {
            $path = $this->getDraftPath($request);
            
            $payload = [
                'data'      => $request->input('data'),
                'turno'     => $request->input('turno'),
                'fecha'     => $request->input('fecha'),
                'timestamp' => now()->toISOString(),
                'user_id'   => Auth::id(),
            ];

            Storage::put($path, json_encode($payload, JSON_PRETTY_PRINT));

            return response()->json(['success' => true, 'path' => $path]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function load(Request $request)
    {
        try {
            $path = $this->getDraftPath($request);

            if (!Storage::exists($path)) {
                return response()->json(['success' => true, 'draft' => null]);
            }

            $raw  = Storage::get($path);
            $data = json_decode($raw, true);

            // Verificar que pertenece al turno/fecha actual (igual que storageService)
            $storedFecha = $data['fecha'] ?? null;
            $storedTurno = $data['turno'] ?? null;

            if ($storedFecha !== $request->input('fecha') 
                || $storedTurno !== $request->input('turno')) {
                // Draft caducado — borrarlo y responder vacío
                Storage::delete($path);
                return response()->json(['success' => true, 'draft' => null]);
            }

            // Caducidad de 8 horas
            $ts      = \Carbon\Carbon::parse($data['timestamp']);
            $diffHrs = $ts->diffInHours(now());
            if ($diffHrs > 8) {
                Storage::delete($path);
                return response()->json(['success' => true, 'draft' => null]);
            }

            return response()->json(['success' => true, 'draft' => $data['data']]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function clear(Request $request)
    {
        try {
            $path = $this->getDraftPath($request);
            Storage::delete($path);
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}