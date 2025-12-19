<?php
/* app/Http/Controllers/ExcelReportController.php */
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\RecepcionScrap;
use App\Models\ConfigTipoScrap; // Necesario para las columnas
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\FormatoScrapEmpresaExport;
use App\Exports\ReporteRecepcionExport;
use App\Mail\ReporteScrapMail;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExcelReportController extends Controller
{
    // ... (Métodos exportFormatoEmpresa, exportReporteRecepcion se mantienen igual) ...
    public function exportFormatoEmpresa(Request $request): BinaryFileResponse
    {
        // ... (Tu código existente) ...
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
        // ... (Tu código existente) ...
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

    // NUEVO MÉTODO: Obtener datos para vista previa JSON
    public function previewFormatoEmpresa(Request $request)
    {
        try {
            $validated = $request->validate([
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;

            // 1. Obtener Registros
            $query = RegistrosScrap::with(['operador', 'detalles.tipoScrap'])
                ->whereDate('fecha_registro', $fecha);

            if ($turno) $query->where('turno', $turno);
            if ($user->role !== 'admin') $query->where('operador_id', $user->id);

            $registros = $query->orderBy('area_real')->orderBy('maquina_real')->get();

            if ($registros->count() === 0) {
                return response()->json(['message' => 'No hay datos para mostrar'], 404);
            }

            // 2. Obtener Columnas Dinámicas (Materiales de Operador)
            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])
                ->orderBy('orden')
                ->get();

            // 3. Estructurar Datos para la Tabla
            $filas = $registros->map(function($r) use ($materiales) {
                $fila = [
                    'area' => $r->area_real,
                    'maquina' => $r->maquina_real,
                    'valores' => [],
                    'total' => (float)$r->peso_total
                ];

                foreach ($materiales as $mat) {
                    // Usamos el helper del modelo o buscamos manual en la relacion cargada
                    $detalle = $r->detalles->firstWhere('tipo_scrap_id', $mat->id);
                    $fila['valores'][$mat->id] = $detalle ? (float)$detalle->peso : 0;
                }
                return $fila;
            });

            // 4. Calcular Totales por Columna
            $totales = [];
            foreach ($materiales as $mat) {
                $totales[$mat->id] = $filas->sum(function($f) use ($mat) {
                    return $f['valores'][$mat->id];
                });
            }
            $granTotal = $filas->sum('total');

            return response()->json([
                'headers' => $materiales,
                'rows' => $filas,
                'totales' => $totales,
                'granTotal' => $granTotal,
                'fecha' => $fecha,
                'turno' => $turno ?? 'Todos',
                'operador' => $user->name
            ]);

        } catch (\Exception $e) {
            return response()->json(['message' => 'Error generando vista previa: ' . $e->getMessage()], 500);
        }
    }

    // ... (El método enviarReporteCorreo se mantiene igual) ...
    public function enviarReporteCorreo(Request $request)
    {
        // ... tu código existente de enviarReporteCorreo ...
        try {
            $validated = $request->validate([
                'email_destino' => 'required|email',
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;
            $emailDestino = $validated['email_destino'];

            // 1. Obtener datos
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
                return response()->json(['message' => 'No hay registros para enviar en la fecha seleccionada'], 404);
            }

            // 2. Generar nombre de archivo
            $fechaObj = Carbon::parse($fecha);
            $dia = $fechaObj->format('d');
            $anio = $fechaObj->format('Y');
            $meses = [1=>'ENE',2=>'FEB',3=>'MAR',4=>'ABR',5=>'MAY',6=>'JUN',7=>'JUL',8=>'AGO',9=>'SEP',10=>'OCT',11=>'NOV',12=>'DIC'];
            $mes = $meses[$fechaObj->month];
            
            $turnoTexto = "TODOS";
            if ($turno == 1) $turnoTexto = "T1";
            if ($turno == 2) $turnoTexto = "T2";
            if ($turno == 3) $turnoTexto = "T3";

            $fileName = "REPORTE_SCRAP_{$dia}{$mes}{$anio}_{$turnoTexto}.xlsx";
            
            // 3. Guardar temporalmente
            $tempPath = 'temp/' . $fileName;

            if (!Storage::disk('local')->exists('temp')) {
                Storage::disk('local')->makeDirectory('temp');
            }

            Excel::store(
                new FormatoScrapEmpresaExport($registros, $fecha, $turno, $user), 
                $tempPath, 
                'local'
            );

            if (!Storage::disk('local')->exists($tempPath)) {
                throw new \Exception("El archivo Excel no se pudo generar en el servidor.");
            }

            $fullPath = Storage::disk('local')->path($tempPath);

            // 4. Enviar correo (Usando configuración global del .env)
            Mail::to($emailDestino)->send(new ReporteScrapMail(
                $fecha,
                $turnoTexto,
                $user->name,
                $fullPath,
                $fileName
            ));

            // 5. Limpieza
            try {
                Storage::disk('local')->delete($tempPath);
            } catch (\Exception $e) {}

            return response()->json(['message' => 'Reporte enviado correctamente a ' . $emailDestino]);

        } catch (\Exception $e) {
            \Log::error('❌ Error enviando correo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al enviar correo: ' . $e->getMessage()], 500);
        }
    }
}