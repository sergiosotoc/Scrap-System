<?php
/* app/Http/Controllers/ExcelReportController.php */
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\RecepcionScrap; // Singular
use Illuminate\Support\Facades\Auth;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\FormatoScrapEmpresaExport;
use App\Exports\ReporteRecepcionExport; // Singular
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

            $fechaObj = Carbon::parse($fecha);
            $dia = $fechaObj->format('d');
            $anio = $fechaObj->format('Y');
            $meses = [1=>'ENE',2=>'FEB',3=>'MAR',4=>'ABR',5=>'MAY',6=>'JUN',7=>'JUL',8=>'AGO',9=>'SEP',10=>'OCT',11=>'NOV',12=>'DIC'];
            $mes = $meses[$fechaObj->month];
            
            $fechaTexto = "{$dia} DE {$mes} {$anio}";
            $turnoTexto = "TODOS LOS TURNOS";
            if ($turno == 1) $turnoTexto = "PRIMER TURNO";
            if ($turno == 2) $turnoTexto = "SEGUNDO TURNO";
            if ($turno == 3) $turnoTexto = "TERCER TURNO";

            $fileName = "FORMATO SCRAP {$fechaTexto} {$turnoTexto}.xlsx";

            return Excel::download(
                new FormatoScrapEmpresaExport($registros, $fecha, $turno, $user), 
                $fileName
            );

        } catch (\Exception $e) {
            \Log::error('❌ Error en exportFormatoEmpresa: ' . $e->getMessage());
            throw $e;
        }
    }

    public function exportReporteRecepcion(Request $request): BinaryFileResponse
    {
        try {
            $validated = $request->validate([
                'fecha_inicio' => 'required|date',
                'fecha_fin' => 'required|date|after_or_equal:fecha_inicio',
                'destino' => 'nullable|string'
            ]);

            $user = Auth::user();

            $fechaInicio = $validated['fecha_inicio'] . ' 00:00:00';
            $fechaFin = $validated['fecha_fin'] . ' 23:59:59';

            $query = RecepcionScrap::with('receptor')
                ->whereBetween('fecha_entrada', [$fechaInicio, $fechaFin]);

            $nombreDestino = "GENERAL";

            if (!empty($validated['destino'])) {
                $query->where('destino', $validated['destino']);
                $nombreDestino = strtoupper($validated['destino']);
            }

            $recepciones = $query->orderBy('fecha_entrada', 'desc')->get();

            if ($recepciones->count() === 0) {
                abort(404, 'No hay recepciones en el rango seleccionado');
            }

            $fileName = "REPORTE RECEPCIONES {$validated['fecha_inicio']} AL {$validated['fecha_fin']} {$nombreDestino}.xlsx";

            return Excel::download(
                new ReporteRecepcionExport($recepciones, $validated, $user),
                $fileName
            );

        } catch (\Exception $e) {
            \Log::error('❌ Error en exportReporteRecepcion: ' . $e->getMessage());
            throw $e;
        }
    }
}