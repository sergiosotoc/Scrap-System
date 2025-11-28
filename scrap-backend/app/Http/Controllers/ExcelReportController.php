<?php
/* app/Http/Controllers/ExcelReportController.php */

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\FormatoScrapEmpresaExport;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExcelReportController extends Controller
{
    public function exportFormatoEmpresa(Request $request): BinaryFileResponse
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
                abort(404, 'No hay registros para la fecha seleccionada');
            }

            // FORZAR nombre con fecha actual
            $fechaActual = Carbon::now()->format('Y-m-d');
            $turnoTexto = $turno ? "_TURNO_{$turno}" : '';
            $fileName = "CONTROL_SCRAP_{$fechaActual}{$turnoTexto}.xlsx";

            \Log::info("📁 Generando archivo: {$fileName}");

            return Excel::download(
                new FormatoScrapEmpresaExport($registros, $fecha, $turno, $user), 
                $fileName
            );

        } catch (\Exception $e) {
            \Log::error('❌ Error en exportFormatoEmpresa: ' . $e->getMessage());
            throw $e;
        }
    }
}