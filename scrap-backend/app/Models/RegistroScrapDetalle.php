<?php
/* app/models/RegistroScrapDetalle.php */
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegistroScrapDetalle extends Model
{
    use HasFactory;

    protected $table = 'registro_scrap_detalles';

    protected $fillable = [
        'registro_id',
        'tipo_scrap_id',
        'peso',
    ];

    public function registro()
    {
        return $this->belongsTo(RegistrosScrap::class, 'registro_id');
    }

    public function tipoScrap()
    {
        return $this->belongsTo(ConfigTipoScrap::class, 'tipo_scrap_id');
    }
}