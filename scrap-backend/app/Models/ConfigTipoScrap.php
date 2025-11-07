<?php
// app/Models/ConfigTipoScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ConfigTipoScrap extends Model
{
    protected $table = 'config_tipos_scrap';
    
    protected $fillable = [
        'categoria', 'tipo_nombre', 'columna_db', 'orden', 'activo'
    ];

    public function scopeActivos($query)
    {
        return $query->where('activo', true);
    }

    public function scopePorCategoria($query, $categoria)
    {
        return $query->where('categoria', $categoria);
    }

    public static function getTiposPorCategoria($categoria)
    {
        return self::where('categoria', $categoria)
                  ->where('activo', true)
                  ->orderBy('orden')
                  ->get();
    }
}