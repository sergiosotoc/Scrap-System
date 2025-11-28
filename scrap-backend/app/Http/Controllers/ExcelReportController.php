<?php
/* app/Http/Controllers/ExcelReportController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\RecepcionesScrap;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\RegistrosScrapExport;
use App\Exports\FormatoScrapEmpresaExport;
use App\Exports\ReporteDiarioExport;

class ExcelReportController extends Controller
{
    public function exportFormatoEmpresa(Request $request)
    {
        try {
            \Log::info('📊 Iniciando exportación formato empresa');

            $validated = $request->validate([
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;

            $query = RegistrosScrap::with('operador')
                ->whereDate('fecha_registro', $fecha);

            if ($turno) {
                $query->where('turno', $turno);
            }

            if ($user->role !== 'admin') {
                $query->where('operador_id', $user->id);
            }

            $registros = $query->orderBy('area_real')->orderBy('maquina_real')->get();

            \Log::info("📈 Encontrados {$registros->count()} registros para formato empresa");

            if ($registros->count() === 0) {
                return response()->json(['error' => 'No hay registros para la fecha seleccionada'], 404);
            }

            $fileName = 'formato_scrap_empresa_' . $fecha . ($turno ? '_turno_' . $turno : '') . '.xlsx';

            return Excel::download(new FormatoScrapEmpresaExport($registros, $fecha, $turno, $user), $fileName);
        } catch (\Exception $e) {
            \Log::error('❌ Error en exportFormatoEmpresa: ' . $e->getMessage());
            \Log::error('📋 Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'error' => 'Error al generar el formato empresarial: ' . $e->getMessage()
            ], 500);
        }
    }
}
