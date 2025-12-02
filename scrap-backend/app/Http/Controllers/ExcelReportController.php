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

            if ($registros->count() === 0) {
                abort(404, 'No hay registros para la fecha seleccionada');
            }

            // --- GENERAR NOMBRE DE ARCHIVO ---
            // Formato esperado: FORMATO SCRAP 27 DE OCT 2025 TERCER TURNO
            
            $fechaObj = Carbon::parse($fecha);
            $dia = $fechaObj->format('d');
            $anio = $fechaObj->format('Y');
            
            // Mapeo manual de meses (Mayúsculas)
            $meses = [
                1 => 'ENE', 2 => 'FEB', 3 => 'MAR', 4 => 'ABR', 5 => 'MAY', 6 => 'JUN',
                7 => 'JUL', 8 => 'AGO', 9 => 'SEP', 10 => 'OCT', 11 => 'NOV', 12 => 'DIC'
            ];
            $mes = $meses[$fechaObj->month];
            
            $fechaTexto = "{$dia} DE {$mes} {$anio}";

            // Turno
            $turnoTexto = "TODOS LOS TURNOS";
            if ($turno == 1) $turnoTexto = "PRIMER TURNO";
            if ($turno == 2) $turnoTexto = "SEGUNDO TURNO";
            if ($turno == 3) $turnoTexto = "TERCER TURNO";

            $fileName = "FORMATO SCRAP {$fechaTexto} {$turnoTexto}.xlsx";

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