<?php
/* app/Http/Controllers/ExcelReportController.php */
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\RegistrosScrap;
use App\Models\RecepcionScrap;
use App\Models\ConfigTipoScrap;
use App\Models\DestinatarioCorreo; 
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

            $fileName = "REPORTE SCRAP {$fechaTexto} {$turnoTexto}.xlsx";

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

    public function enviarReporteCorreo(Request $request)
    {
        try {
            \Log::info('📧 Iniciando envío automático de reporte');

            $validated = $request->validate([
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;

            // 1. Obtener TODOS los destinatarios de la BD
            $destinatarios = DestinatarioCorreo::pluck('email')->toArray();

            if (empty($destinatarios)) {
                \Log::warning('⚠️ No hay destinatarios configurados en el sistema');
                return response()->json(['message' => 'No hay destinatarios configurados en el sistema.'], 422);
            }

            \Log::info('📧 Destinatarios encontrados: ' . implode(', ', $destinatarios));

            // 2. Obtener datos para el reporte
            $query = RegistrosScrap::with('operador')->whereDate('fecha_registro', $fecha);
            if ($turno) $query->where('turno', $turno);
            if ($user->role !== 'admin') $query->where('operador_id', $user->id);
            
            $registros = $query->orderBy('area_real')->orderBy('maquina_real')->get();

            if ($registros->count() === 0) {
                \Log::warning('⚠️ No hay registros para enviar en fecha: ' . $fecha);
                return response()->json(['message' => 'No hay registros para enviar.'], 404);
            }

            // 3. Generar nombre del archivo
            $fechaObj = Carbon::parse($fecha);
            $dia = $fechaObj->format('d');
            $anio = $fechaObj->format('Y');
            $meses = [1=>'ENE',2=>'FEB',3=>'MAR',4=>'ABR',5=>'MAY',6=>'JUN',7=>'JUL',8=>'AGO',9=>'SEP',10=>'OCT',11=>'NOV',12=>'DIC'];
            $mes = $meses[$fechaObj->month];
            
            $turnoTexto = "TODOS";
            if ($turno == 1) $turnoTexto = "T1";
            if ($turno == 2) $turnoTexto = "T2";
            if ($turno == 3) $turnoTexto = "T3";

            $fechaTexto = $fechaObj->format('d') . '-' . $mes . '-' . $fechaObj->format('y');
            $fileName = "REPORTE SCRAP {$fechaTexto} {$turnoTexto}.xlsx";
            $tempPath = 'temp/' . $fileName;

            // 4. Crear directorio temporal si no existe
            if (!Storage::disk('local')->exists('temp')) {
                Storage::disk('local')->makeDirectory('temp');
            }

            // 5. Generar Excel y guardarlo temporalmente
            \Log::info('📊 Generando archivo Excel: ' . $fileName);
            Excel::store(
                new FormatoScrapEmpresaExport($registros, $fecha, $turno, $user), 
                $tempPath, 
                'local'
            );

            if (!Storage::disk('local')->exists($tempPath)) {
                throw new \Exception("El archivo Excel no se pudo generar en el servidor.");
            }

            $fullPath = Storage::disk('local')->path($tempPath);

            // 6. Preparar asunto del correo
            $asunto = "REPORTE DE SCRAP DE {$turnoTexto} {$fechaTexto}";

            // 7. Enviar Correo masivo
            \Log::info('📤 Enviando correo a ' . count($destinatarios) . ' destinatarios');
            
            Mail::to($destinatarios)->send(new ReporteScrapMail(
                $asunto,
                $user->name,
                $fullPath,
                $fileName
            ));

            // 8. Limpieza del archivo temporal
            try {
                Storage::disk('local')->delete($tempPath);
                \Log::info('🗑️ Archivo temporal eliminado: ' . $tempPath);
            } catch (\Exception $e) {
                \Log::warning('⚠️ No se pudo eliminar archivo temporal: ' . $e->getMessage());
            }

            $mensaje = '✅ Reporte enviado correctamente a ' . count($destinatarios) . ' destinatarios';
            \Log::info($mensaje);

            return response()->json([
                'message' => $mensaje,
                'destinatarios' => $destinatarios,
                'count' => count($destinatarios)
            ]);

        } catch (\Exception $e) {
            \Log::error('❌ Error enviando correo: ' . $e->getMessage());
            \Log::error($e->getTraceAsString());
            return response()->json([
                'message' => 'Error al enviar correo: ' . $e->getMessage()
            ], 500);
        }
    }
    
    public function getDestinatariosCorreo()
    {
        try {
            $destinatarios = DestinatarioCorreo::orderBy('email')->get();
            return response()->json([
                'destinatarios' => $destinatarios,
                'count' => $destinatarios->count()
            ]);
        } catch (\Exception $e) {
            \Log::error('❌ Error obteniendo destinatarios: ' . $e->getMessage());
            return response()->json(['message' => 'Error obteniendo destinatarios'], 500);
        }
    }
}