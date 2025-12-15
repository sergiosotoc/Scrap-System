<?php
// app/Http/Controllers/DashboardController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RegistrosScrap;
use App\Models\RecepcionScrap;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function stats()
    {
        // 1. Contadores Generales
        $stats = [
            'total_usuarios' => User::count(),
            'total_registros' => RegistrosScrap::count(),
            'total_recepciones' => RecepcionScrap::count(),
            'total_peso_kg' => (float) RegistrosScrap::sum('peso_total'), 
            'total_peso_recepciones' => (float) RecepcionScrap::sum('peso_kg'),
            'eficiencia_global' => 98.5 
        ];

        // 2. Gráfica de Barras (Últimos 6 meses)
        $meses = [];
        $produccion = [];
        $recepcion = [];
        
        // Generar últimos 6 meses
        for ($i = 5; $i >= 0; $i--) {
            $date = Carbon::now()->subMonths($i);
            $month = $date->month;
            $year = $date->year;
            $mesNombre = strtoupper($date->translatedFormat('M')); // ENE, FEB...
            
            $meses[] = $mesNombre;
            
            // Sumar registros del mes
            $prod = RegistrosScrap::whereYear('fecha_registro', $year)
                ->whereMonth('fecha_registro', $month)
                ->sum('peso_total');
            $produccion[] = round($prod, 2);
            
            // Sumar recepciones del mes
            $rec = RecepcionScrap::whereYear('fecha_entrada', $year)
                ->whereMonth('fecha_entrada', $month)
                ->sum('peso_kg');
            $recepcion[] = round($rec, 2);
        }
        
        $stats['grafica_barras'] = [
            'meses' => $meses,
            'produccion' => $produccion,
            'recepcion' => $recepcion
        ];

        // 3. Distribución de Materiales (Donut Chart - Top 5 Recepción)
        $distribucion = RecepcionScrap::select('tipo_material as name', DB::raw('SUM(peso_kg) as value'))
            ->groupBy('tipo_material')
            ->orderByDesc('value')
            ->limit(5)
            ->get();
            
        // Asignar colores para el frontend
        $colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];
        $distribucionData = $distribucion->map(function($item, $key) use ($colors) {
            return [
                'name' => $item->name,
                'value' => round($item->value, 2),
                'color' => $colors[$key % count($colors)]
            ];
        });
        
        $stats['distribucion_materiales'] = $distribucionData;

        // 4. Actividad Reciente (Combinada y ordenada)
        $recentRegistros = RegistrosScrap::with('operador')
            ->orderBy('fecha_registro', 'desc')
            ->limit(5)
            ->get()
            ->map(function($r) {
                return [
                    'tipo' => 'registro',
                    'area' => $r->area_real,
                    'operador' => $r->operador->name ?? 'N/A',
                    'peso' => round($r->peso_total, 2),
                    'fecha' => Carbon::parse($r->fecha_registro)->format('Y-m-d H:i'),
                    'material' => 'Producción'
                ];
            });

        $recentRecepciones = RecepcionScrap::with('receptor')
            ->orderBy('fecha_entrada', 'desc')
            ->limit(5)
            ->get()
            ->map(function($r) {
                return [
                    'tipo' => 'recepcion',
                    'material' => $r->tipo_material,
                    'receptor' => $r->receptor->name ?? 'N/A', // Usamos key genérica en frontend a veces
                    'operador' => $r->receptor->name ?? 'N/A', // Mapeo doble por compatibilidad
                    'peso' => round($r->peso_kg, 2),
                    'fecha' => Carbon::parse($r->fecha_entrada)->format('Y-m-d H:i'),
                    'area' => $r->origen_tipo === 'interna' ? 'Planta' : 'Externo'
                ];
            });
            
        $stats['actividad_reciente'] = [
            'registros' => $recentRegistros,
            'recepciones' => $recentRecepciones
        ];

        return response()->json($stats);
    }
}