<?php
// app/Models/ConfigAreaMaquina.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfigAreaMaquina extends Model
{
    protected $table = 'config_areas_maquinas';
    
    protected $fillable = [
        'area_nombre', 'maquina_nombre', 'orden', 'activa'
    ];

    // ELIMINADO: scopeActivas (Aunque la columna exista, ya no la usaremos para filtrar)

    public function scopePorArea($query, $area)
    {
        return $query->where('area_nombre', $area);
    }

    public static function getMaquinasPorArea($area)
    {
        return self::where('area_nombre', $area)
                   // ->where('activa', true) <-- ELIMINADO EL FILTRO
                   ->orderBy('orden')
                   ->pluck('maquina_nombre')
                   ->toArray();
    }
}