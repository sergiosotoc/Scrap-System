<?php
// app/Models/RecepcionesScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecepcionesScrap extends Model
{
    protected $table = 'recepciones_scrap';
    
    // Eliminado 'fecha_registro' del array fillable
    protected $fillable = [
        'numero_hu', 'peso_kg', 'tipo_material', 'origen_tipo', 'origen_especifico',
        'receptor_id', 'destino', 'lugar_almacenamiento',
        'observaciones', 'impreso', 'fecha_entrada'
    ];

    protected $casts = [
        'fecha_entrada' => 'datetime',
        // 'fecha_registro' => 'datetime', // Eliminado
        'impreso' => 'boolean',
    ];

    public function receptor()
    {
        return $this->belongsTo(User::class, 'receptor_id');
    }

    public function scopePorReceptor($query, $receptorId)
    {
        return $query->where('receptor_id', $receptorId);
    }

    public function scopePorDestino($query, $destino)
    {
        return $query->where('destino', $destino);
    }

    public function scopePorTipoMaterial($query, $tipoMaterial)
    {
        return $query->where('tipo_material', $tipoMaterial);
    }

    public function scopeImpresos($query)
    {
        return $query->where('impreso', true);
    }

    // Marcar como impreso
    public function marcarImpreso()
    {
        $this->impreso = true;
        return $this->save();
    }
}