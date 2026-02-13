<?php
// app/Models/ConfigTipoScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ConfigTipoScrap extends Model
{
    use HasFactory;

    protected $table = 'config_tipos_scrap';

    protected $fillable = [
        'tipo_nombre',
        'uso',
        'columna_db',
        'orden',
    ];

    public function scopeOperador($query)
    {
        return $query->whereIn('uso', ['operador', 'ambos'])->orderBy('orden');
    }

    public function scopeReceptor($query)
    {
        return $query->whereIn('uso', ['receptor', 'ambos'])->orderBy('orden');
    }
}