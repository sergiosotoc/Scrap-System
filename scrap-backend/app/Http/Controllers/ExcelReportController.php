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
        $validated = $request->validate([
            'fecha' => 'required|date',
            'turno' => 'nullable|in:1,2,3'
        ]);

        $user = Auth::user();
        $fecha = $validated['fecha'];
        $turno = $validated['turno'] ?? null;

        // 1. MAPA MAESTRO: Estructura exacta que deseas mantener
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

        // 2. Obtener datos reales y configuración de la BD
        $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])->orderBy('orden', 'asc')->get();
        $registrosBD = RegistrosScrap::with(['detalles.tipoScrap'])
            ->whereDate('fecha_registro', $fecha)
            ->when($turno, fn($q) => $q->where('turno', $turno))
            ->get();

        // Obtener todas las máquinas que existen actualmente en la configuración global
        $configController = new \App\Http\Controllers\RegistrosScrapController();
        $configuracionActual = (array) $configController->getConfiguracion()->getData()->areas_maquinas;

        $coleccionFinal = collect();
        $maquinasProcesadas = []; // Para saber qué máquinas ya pusimos en el Excel

        // 3. Paso 1: Rellenar el Excel con el Mapa Maestro
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

                $maquinasProcesadas[$areaKey][] = $maqKey;
            }
        }

        // 4. Paso 2: DINAMISMO - Agregar máquinas nuevas que no estaban en el mapa
        foreach ($configuracionActual as $areaConfig => $maquinasConfig) {
            $areaConfigUpper = strtoupper(trim($areaConfig));
            
            foreach ($maquinasConfig as $m) {
                $maqNombre = $m->maquina_nombre;
                $maqNombreUpper = strtoupper(trim($maqNombre));

                // Si esta máquina de la configuración NO está en nuestro mapa maestro, la agregamos
                if (!isset($maquinasProcesadas[$areaConfigUpper]) || !in_array($maqNombreUpper, $maquinasProcesadas[$areaConfigUpper])) {
                    
                    $registroNuevo = $this->buscarRegistro($registrosBD, $areaConfigUpper, $maqNombreUpper);
                    
                    $coleccionFinal->push($registroNuevo ?? new RegistrosScrap([
                        'area_real' => $areaConfig,
                        'maquina_real' => $maqNombre,
                        'peso_total' => 0
                    ]));
                }
            }
        }

        $fechaTexto = Carbon::parse($fecha)->format('d-M-Y');
        return Excel::download(
            new FormatoScrapEmpresaExport($coleccionFinal, $fecha, $turno, $user, $materiales),
            "REPORTE_SCRAP_{$fechaTexto}.xlsx"
        );

    } catch (\Exception $e) {
        \Log::error('Error exportación: ' . $e->getMessage());
        throw $e;
    }
}

// Función auxiliar para limpiar la búsqueda
private function buscarRegistro($coleccion, $area, $maquina) {
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

            // 1. Obtener registros existentes y tipos de scrap
            $query = RegistrosScrap::with(['detalles.tipoScrap'])
                ->whereDate('fecha_registro', $fecha);
            if ($turno) $query->where('turno', $turno);
            if ($user->role !== 'admin') $query->where('operador_id', $user->id);
            $registrosBD = $query->get();

            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])
                ->orderBy('orden', 'asc')->get();

            // 2. Obtener Molde de Máquinas
            $configController = new \App\Http\Controllers\RegistrosScrapController();
            $areasMaquinas = $configController->getConfiguracion()->getData()->areas_maquinas;

            // 3. Estructurar filas combinando Config + BD
            $filas = [];
            foreach ($areasMaquinas as $area => $maquinas) {
                foreach ($maquinas as $m) {
                    $reg = $registrosBD->where('area_real', $area)
                        ->where('maquina_real', $m->maquina_nombre)
                        ->first();

                    $fila = [
                        'area' => $area,
                        'maquina' => $m->maquina_nombre,
                        'valores' => [],
                        'total' => $reg ? (float)$reg->peso_total : 0
                    ];

                    foreach ($materiales as $mat) {
                        $peso = 0;
                        if ($reg) {
                            $det = $reg->detalles->firstWhere('tipo_scrap_id', $mat->id);
                            $peso = $det ? (float)$det->peso : 0;
                        }
                        $fila['valores'][$mat->id] = $peso;
                    }
                    $filas[] = $fila;
                }
            }

            // 4. Calcular Totales de columna basados en el cruce anterior
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
            return response()->json(['message' => 'Error: ' . $e->getMessage()], 500);
        }
    }

    // ... (El resto de métodos exportReporteRecepcion, enviarReporteCorreo y getDestinatariosCorreo se mantienen igual)
    // Pero asegúrate de que enviarReporteCorreo use la lógica de la colección completa si deseas el Excel completo por mail

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
            \Log::error('❌ Error: ' . $e->getMessage());
            throw $e;
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

            // 1. Obtener materiales dinámicos (Indispensable para el nuevo constructor)
            $materiales = ConfigTipoScrap::whereIn('uso', ['operador', 'ambos'])
                ->orderBy('orden', 'asc')
                ->get();

            // 2. Obtener los destinatarios de la BD
            $destinatarios = DestinatarioCorreo::pluck('email')->toArray();

            if (empty($destinatarios)) {
                return response()->json(['message' => 'No hay destinatarios configurados.'], 422);
            }

            // 3. Obtener registros reales
            $query = RegistrosScrap::with(['detalles.tipoScrap'])->whereDate('fecha_registro', $fecha);
            if ($turno) $query->where('turno', $turno);
            $registrosBD = $query->get();

            // 4. Obtener molde de Áreas/Máquinas y realizar el cruce (Orden estricto)
            $configController = new \App\Http\Controllers\RegistrosScrapController();
            $areasMaquinas = (array) $configController->getConfiguracion()->getData()->areas_maquinas;

            $ordenAreas = ['EBEAM', 'RWD', 'OTHERS', 'FPS'];
            $coleccionFinal = collect();

            foreach ($ordenAreas as $areaNombre) {
                if (!isset($areasMaquinas[$areaNombre])) continue;
                foreach ($areasMaquinas[$areaNombre] as $maquina) {
                    $reg = $registrosBD->filter(function ($item) use ($areaNombre, $maquina) {
                        return trim(strtoupper($item->area_real)) === trim(strtoupper($areaNombre)) &&
                            trim(strtoupper($item->maquina_real)) === trim(strtoupper($maquina->maquina_nombre));
                    })->first();

                    $coleccionFinal->push($reg ?? new RegistrosScrap([
                        'area_real' => $areaNombre,
                        'maquina_real' => $maquina->maquina_nombre,
                        'peso_total' => 0
                    ]));
                }
            }

            // 5. Generar archivo temporal (Pasando los 5 argumentos al constructor)
            $fechaTexto = Carbon::parse($fecha)->format('d-M-Y');
            $turnoTexto = $turno ? "T$turno" : "TODOS";
            $fileName = "REPORTE SCRAP {$fechaTexto} {$turnoTexto}.xlsx";
            $tempPath = 'temp/' . $fileName;

            if (!Storage::disk('local')->exists('temp')) {
                Storage::disk('local')->makeDirectory('temp');
            }

            // CORRECCIÓN AQUÍ: Se envían los 5 parámetros
            Excel::store(
                new FormatoScrapEmpresaExport($coleccionFinal, $fecha, $turno, $user, $materiales),
                $tempPath,
                'local'
            );

            $fullPath = Storage::disk('local')->path($tempPath);
            $asunto = "REPORTE DE SCRAP - " . $fechaTexto;

            // 6. Enviar Correo
            Mail::to($destinatarios)->send(new ReporteScrapMail(
                $asunto,
                $user->name,
                $fullPath,
                $fileName
            ));

            // 7. Limpiar archivo temporal
            Storage::disk('local')->delete($tempPath);

            return response()->json(['message' => '✅ Reporte enviado correctamente a ' . count($destinatarios) . ' destinatarios']);
        } catch (\Exception $e) {
            \Log::error('❌ Error enviando correo: ' . $e->getMessage());
            return response()->json(['message' => 'Error al enviar correo: ' . $e->getMessage()], 500);
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
}
