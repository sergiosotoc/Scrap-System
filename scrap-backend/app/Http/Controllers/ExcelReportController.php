<?php
/* app/Http/Controllers/ExcelReportController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\RegistrosScrapExport;
use App\Exports\ReporteDiarioExport;

class ExcelReportController extends Controller
{
    public function exportRegistrosScrap(Request $request)
    {
        try {
            \Log::info('📊 Iniciando exportación de registros scrap');

            $user = Auth::user();
            $query = RegistrosScrap::with('operador');

            // Filtros básicos
            if ($request->has('area') && $request->area != '') {
                $query->where('area_real', $request->area);
            }

            if ($request->has('turno') && $request->turno != '') {
                $query->where('turno', $request->turno);
            }

            if ($request->has('fecha') && $request->fecha != '') {
                $query->whereDate('fecha_registro', $request->fecha);
            }

            // Control de acceso por rol
            if ($user->role !== 'admin') {
                $query->where('operador_id', $user->id);
            }

            $registros = $query->orderBy('fecha_registro', 'desc')->get();

            \Log::info("📈 Encontrados {$registros->count()} registros para exportar");

            if ($registros->count() === 0) {
                return response()->json(['error' => 'No hay registros para exportar'], 404);
            }

            $fileName = 'registros_scrap_' . now()->format('Y_m_d_His') . '.xlsx';

            return Excel::download(new RegistrosScrapExport($registros), $fileName);
        } catch (\Exception $e) {
            \Log::error('❌ Error en exportRegistrosScrap: ' . $e->getMessage());
            \Log::error('📋 Stack trace: ' . $e->getTraceAsString());

            return response()->json([
                'error' => 'Error al generar el reporte Excel: ' . $e->getMessage()
            ], 500);
        }
    }

    public function exportReporteDiario(Request $request)
    {
        try {
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

            $registros = $query->get();

            if ($registros->count() === 0) {
                return response()->json(['error' => 'No hay registros para la fecha seleccionada'], 404);
            }

            $fileName = 'reporte_diario_' . $fecha . ($turno ? '_turno_' . $turno : '') . '.xlsx';

            return Excel::download(new ReporteDiarioExport($registros, $fecha, $turno, $user), $fileName);
        } catch (\Exception $e) {
            \Log::error('❌ Error en exportReporteDiario: ' . $e->getMessage());
            return response()->json(['error' => 'Error al generar el reporte diario'], 500);
        }
    }
}