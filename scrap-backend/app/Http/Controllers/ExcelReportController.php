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
use App\Exports\AuditoriaConciliacionExport;
use App\Mail\ReporteScrapMail;
use Carbon\Carbon;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class ExcelReportController extends Controller
{
    private function generarColeccionReporte($fecha, $turno, $registrosBD)
    {
        $mapaEstructura = [
            ['area' => 'ROD', 'maquinas' => ['ROD']],
            ['area' => 'TREFILADO', 'maquinas' => ['TREF 1', 'TREF 2', 'TREF 3', 'TREF 4', 'TREF 5', 'TREF 6']],
            ['area' => 'BUNCHER', 'maquinas' => ['ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4', 'ZONA 5', 'ZONA 6', 'ZONA 7', 'ZONA 8', 'ZONA 9', 'ZONA 10', 'ZONA 11', 'ZONA 12', 'ZONA 13', 'ZONA 14', 'ZONA 15', '800']],
            ['area' => 'CABALLE', 'maquinas' => ['CABALLE']],
            ['area' => 'EXTRUSION', 'maquinas' => ['EXT01', 'EXT02', 'EXT03', 'EXT04', 'EXT05', 'EXT06', 'EXT07', 'EXT08', 'EXT09']],
            ['area' => 'BATERIA', 'maquinas' => ['Bateria PVC', 'Bateria XLPE']],
            ['area' => 'XLPE', 'maquinas' => ['EXT11', 'EXT12', 'EXT13', 'EXT14', 'EXT15', 'EXT16']],
            ['area' => 'EBEAM', 'maquinas' => ['Tequila', 'Mezcal', 'Pulque', 'Sotol', 'Tepache', 'WASIK3']],
            ['area' => 'RWD', 'maquinas' => ['REW PVC', 'REW PE', 'REW Battery']],
            ['area' => 'OTHERS', 'maquinas' => ['Ingenieria', 'RYD', 'Mtto.', 'Nuevos Negocios', 'Calidad']],
            ['area' => 'FPS', 'maquinas' => ['FPS Metal', 'FPS STD PVC', 'FPS XLPE', 'FPS Bateria']],
            ['area' => 'OTHERS', 'maquinas' => ['Retrabajo Metal', 'Retrabajo Extrusion', 'Retrabajo Extrusion XLPE', 'REBOBINADORA DE METAL', 'Logistica', 'Obsoleto', 'RMA', 'Proveedores', 'Otras plantas Coficab', 'Recycling Compound', 'Recycling Compound Battery', 'Cable Area Metal', 'Comission Eng']],
        ];

        $configController = new \App\Http\Controllers\RegistrosScrapController();
        $configuracionActual = (array) $configController->getConfiguracion()->getData()->areas_maquinas;

        $coleccionFinal = collect();
        $procesados = []; 

        foreach ($mapaEstructura as $bloque) {
            foreach ($bloque['maquinas'] as $nombreMaq) {
                $areaKey = strtoupper(trim($bloque['area']));
                $maqKey = strtoupper(trim($nombreMaq));

                $registro = $this->buscarRegistro($registrosBD, $areaKey, $maqKey);

                $coleccionFinal->push($registro ?? new RegistrosScrap([
                    'area_real' => $bloque['area'],
                    'maquina_real' => $nombreMaq,
                    'peso_total' => 0
                ]));

                $procesados[] = $areaKey . '|' . $maqKey;
            }
        }

        foreach ($configuracionActual as $areaConfig => $maquinasConfig) {
            $areaUpper = strtoupper(trim($areaConfig));
            foreach ($maquinasConfig as $m) {
                $maqNombre = $m->maquina_nombre;
                $maqUpper = strtoupper(trim($maqNombre));
                $key = $areaUpper . '|' . $maqUpper;

                if (!in_array($key, $procesados)) {
                    $registroNuevo = $this->buscarRegistro($registrosBD, $areaUpper, $maqUpper);

                    $coleccionFinal->push($registroNuevo ?? new RegistrosScrap([
                        'area_real' => $areaConfig,
                        'maquina_real' => $maqNombre,
                        'peso_total' => 0
                    ]));
                    $procesados[] = $key;
                }
            }
        }

        return $coleccionFinal;
    }

    public function exportFormatoEmpresa(Request $request): BinaryFileResponse
    {
        try {
            $validated = $request->validate([
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;

            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])->orderBy('orden', 'asc')->get();

            $registrosBD = RegistrosScrap::with(['detalles.tipoScrap'])
                ->whereDate('fecha_registro', $fecha)
                ->when($turno, fn($q) => $q->where('turno', $turno))
                ->get();

            $coleccionFinal = $this->generarColeccionReporte($fecha, $turno, $registrosBD);

            $fechaTexto = Carbon::parse($fecha)->format('d-M-Y');
            return Excel::download(
                new FormatoScrapEmpresaExport($coleccionFinal, $fecha, $turno, $user, $materiales),
                "REPORTE_SCRAP_{$fechaTexto}.xlsx"
            );
        } catch (\Exception $e) {
            \Log::error("Error Export: " . $e->getMessage());
            throw $e;
        }
    }

    private function buscarRegistro($coleccion, $area, $maquina)
    {
        return $coleccion->filter(function ($item) use ($area, $maquina) {
            return strtoupper(trim($item->area_real)) === $area &&
                strtoupper(trim($item->maquina_real)) === $maquina;
        })->first();
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

            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])
                ->orderBy('orden', 'asc')
                ->get();

            $registrosBD = RegistrosScrap::with(['detalles.tipoScrap'])
                ->whereDate('fecha_registro', $fecha)
                ->when($turno, fn($q) => $q->where('turno', $turno))
                ->when($user->role !== 'admin', fn($q) => $q->where('operador_id', $user->id))
                ->get();

            $coleccionFinal = $this->generarColeccionReporte($fecha, $turno, $registrosBD);

            $filas = [];
            foreach ($coleccionFinal as $item) {
                $fila = [
                    'area' => $item->area_real,
                    'maquina' => $item->maquina_real,
                    'valores' => [],
                    'total' => (float)$item->peso_total
                ];

                foreach ($materiales as $mat) {
                    $peso = 0;
                    if ($item->relationLoaded('detalles')) {
                        $det = $item->detalles->firstWhere('tipo_scrap_id', $mat->id);
                        $peso = $det ? (float)$det->peso : 0;
                    }
                    $fila['valores'][$mat->id] = $peso;
                }

                $filas[] = $fila;
            }

            $totales = [];
            foreach ($materiales as $mat) {
                $totales[$mat->id] = collect($filas)->sum(fn($f) => $f['valores'][$mat->id]);
            }

            return response()->json([
                'headers' => $materiales,
                'rows' => $filas,
                'totales' => $totales,
                'granTotal' => collect($filas)->sum('total'),
                'fecha' => $fecha,
                'turno' => $turno ?? 'Todos',
                'operador' => $user->name
            ]);
        } catch (\Exception $e) {
            \Log::error('Error en previewFormatoEmpresa: ' . $e->getMessage());
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
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

            if (!empty($validated['destino'])) {
                $query->where('destino', $validated['destino']);
            }

            $recepciones = $query->orderBy('fecha_entrada', 'desc')->get();

            if ($recepciones->count() === 0) abort(404, 'No hay recepciones');

            return Excel::download(
                new ReporteRecepcionExport($recepciones, $validated, $user),
                "RECEPCIONES.xlsx"
            );
        } catch (\Exception $e) {
            throw $e;
        }
    }

    public function enviarReporteCorreo(Request $request)
    {
        try {
            $validated = $request->validate([
                'fecha' => 'required|date',
                'turno' => 'nullable|in:1,2,3'
            ]);

            $user = Auth::user();
            $fecha = $validated['fecha'];
            $turno = $validated['turno'] ?? null;

            $hayDatos = RegistrosScrap::whereDate('fecha_registro', $fecha)
                ->when($turno, fn($q) => $q->where('turno', $turno))
                ->when($user->role !== 'admin', fn($q) => $q->where('operador_id', $user->id))
                ->exists();

            if (!$hayDatos) {
                $msgTurno = $turno ? "en el turno $turno" : "en el día";
                return response()->json([
                    'message' => "No se puede enviar el correo: No existen registros de scrap cargados {$msgTurno} para la fecha seleccionada."
                ], 422);
            }

            $destinatarios = DestinatarioCorreo::pluck('email')->toArray();
            if (empty($destinatarios)) {
                return response()->json(['message' => 'No hay destinatarios configurados.'], 422);
            }

            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])->orderBy('orden', 'asc')->get();

            $registrosBD = RegistrosScrap::with(['detalles.tipoScrap'])
                ->whereDate('fecha_registro', $fecha)
                ->when($turno, fn($q) => $q->where('turno', $turno))
                ->get();

            $coleccionFinal = $this->generarColeccionReporte($fecha, $turno, $registrosBD);

            $fechaTexto = Carbon::parse($fecha)->format('d-M-Y');
            $turnoTexto = $turno ? "T$turno" : "TODOS";
            $fileName = "REPORTE SCRAP {$fechaTexto} {$turnoTexto}.xlsx";
            $tempPath = 'temp/' . $fileName;

            if (!Storage::disk('local')->exists('temp')) {
                Storage::disk('local')->makeDirectory('temp');
            }

            Excel::store(
                new FormatoScrapEmpresaExport($coleccionFinal, $fecha, $turno, $user, $materiales),
                $tempPath,
                'local'
            );

            $fullPath = Storage::disk('local')->path($tempPath);
            $asunto = "REPORTE DE SCRAP - " . $fechaTexto . " - " . $user->name;

            Mail::to($destinatarios)->send(new ReporteScrapMail(
                $asunto,
                $user->name,
                $fullPath,
                $fileName
            ));

            Storage::disk('local')->delete($tempPath);

            return response()->json(['message' => 'Reporte enviado correctamente.']);
        } catch (\Exception $e) {
            \Log::error('Error enviando correo: ' . $e->getMessage());
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    public function getDestinatariosCorreo()
    {
        try {
            $destinatarios = DestinatarioCorreo::orderBy('email')->get();
            return response()->json(['destinatarios' => $destinatarios]);
        } catch (\Exception $e) {
            return response()->json(['message' => 'Error'], 500);
        }
    }

    public function exportAuditoria(Request $request)
    {
        $validated = $request->validate([
            'fecha_inicio' => 'required|date',
            'fecha_fin' => 'required|date'
        ]);

        $fechaInicio = $validated['fecha_inicio'];
        $fechaFin = $validated['fecha_fin'];

        $dashController = new DashboardController();
        $request->merge([
            'fecha_inicio' => $fechaInicio,
            'fecha_fin' => $fechaFin,
            'limit' => 100000,
            'offset' => 0
        ]);

        $stats = $dashController->statsContraloria($request)->getData(true);

        $nombreArchivo = "AUDITORIA_SCRAP_" . str_replace('-', '', $fechaInicio) . "_AL_" . str_replace('-', '', $fechaFin) . ".xlsx";

        return Excel::download(
            new AuditoriaConciliacionExport(
                $stats['movimientos'],
                ['inicio' => $fechaInicio, 'fin' => $fechaFin],
                $stats['totales']
            ),
            $nombreArchivo
        );
    }
}
