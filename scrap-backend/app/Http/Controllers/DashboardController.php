<?php
// app/Http/Controllers/DashboardController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use App\Models\RegistrosScrap;
use App\Models\RecepcionesScrap;
use App\Models\StockScrap;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function stats()
    {
        $stats = [
            'total_usuarios' => User::count(),
            'total_usuarios_activos' => User::where('activo', true)->count(),
            'total_registros' => RegistrosScrap::count(),
            'total_recepciones' => RecepcionesScrap::count(),
            'total_peso_registros' => RegistrosScrap::sum('peso_total'),
            'total_peso_recepciones' => RecepcionesScrap::sum('peso_kg'),
        ];

        // Estadísticas por rol de usuarios
        $stats['usuarios_por_rol'] = User::select('role', DB::raw('COUNT(*) as count'))
            ->groupBy('role')
            ->get();

        // Scrap por área
        $stats['scrap_por_area'] = RegistrosScrap::select('area_real', DB::raw('SUM(peso_total) as total_kg'))
            ->groupBy('area_real')
            ->orderBy('total_kg', 'desc')
            ->get();

        // Recepciones por destino
        $stats['recepciones_por_destino'] = RecepcionesScrap::select('destino', DB::raw('COUNT(*) as count, SUM(peso_kg) as total_kg'))
            ->groupBy('destino')
            ->get();

        return response()->json($stats);
    }

    public function recentActivity()
    {
        $recentRegistros = RegistrosScrap::with('operador')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        $recentRecepciones = RecepcionesScrap::with('receptor')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'registros' => $recentRegistros,
            'recepciones' => $recentRecepciones
        ]);
    }

    public function adminStats()
    {
        // Estadísticas detalladas para el admin
        $stats = [
            // Totales generales
            'totales_generales' => [
                'usuarios' => User::count(),
                'registros' => RegistrosScrap::count(),
                'recepciones' => RecepcionesScrap::count(),
                'stock_total' => StockScrap::sum('cantidad_kg'),
            ],

            // Distribución por turnos
            'por_turno' => RegistrosScrap::select('turno', DB::raw('COUNT(*) as count, SUM(peso_total) as total_kg'))
                ->groupBy('turno')
                ->get(),

            // Top áreas con más scrap
            'top_areas' => RegistrosScrap::select('area_real', DB::raw('SUM(peso_total) as total_kg'))
                ->groupBy('area_real')
                ->orderBy('total_kg', 'desc')
                ->limit(5)
                ->get(),

            // Tipos de material más comunes en recepciones
            'top_materiales' => RecepcionesScrap::select('tipo_material', DB::raw('COUNT(*) as count, SUM(peso_kg) as total_kg'))
                ->groupBy('tipo_material')
                ->orderBy('total_kg', 'desc')
                ->limit(5)
                ->get(),

            // Stock disponible
            'stock_disponible' => StockScrap::disponible()
                ->select('tipo_material', DB::raw('SUM(cantidad_kg) as cantidad_total'))
                ->groupBy('tipo_material')
                ->get(),
        ];

        return response()->json($stats);
    }
}