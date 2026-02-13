<?php
/* app/Models/RecepcionScrap.php */
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RecepcionScrap extends Model
{
    use HasFactory;

    protected $table = 'recepciones_scrap';

    protected $fillable = [
        'numero_hu',
        'peso_kg',
        'tipo_material',
        'tipo_scrap_id',
        'origen_tipo',
        'origen_especifico',
        'receptor_id',
        'destino',
        'lugar_almacenamiento',
        'observaciones',
        'impreso',
        'fecha_entrada'
    ];

    protected $casts = [
        'fecha_entrada' => 'datetime',
        'impreso' => 'boolean',
    ];

    public function receptor()
    {
        return $this->belongsTo(User::class, 'receptor_id');
    }

    public function tipoScrap()
    {
        return $this->belongsTo(ConfigTipoScrap::class, 'tipo_scrap_id');
    }

    public function scopePorReceptor($query, $receptorId)
    {
        return $query->where('receptor_id', $receptorId);
    }

    public function scopePorDestino($query, $destino)
    {
        return $query->where('destino', $destino);
    }
}