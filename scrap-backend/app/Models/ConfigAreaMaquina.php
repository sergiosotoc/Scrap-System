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


    public function scopePorArea($query, $area)
    {
        return $query->where('area_nombre', $area);
    }

    public static function getMaquinasPorArea($area)
    {
        return self::where('area_nombre', $area)
                   ->orderBy('orden')
                   ->pluck('maquina_nombre')
                   ->toArray();
    }
}