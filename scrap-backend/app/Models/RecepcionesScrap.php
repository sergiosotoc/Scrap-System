<?php
// app/Models/RecepcionesScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RecepcionesScrap extends Model
{
    protected $table = 'recepciones_scrap';
    
    protected $fillable = [
        'numero_hu', 'peso_kg', 'tipo_material', 'origen_tipo', 'origen_especifico',
        'registro_scrap_id', 'receptor_id', 'destino', 'lugar_almacenamiento',
        'observaciones', 'impreso', 'fecha_entrada', 'fecha_registro'
    ];

    protected $casts = [
        'fecha_entrada' => 'datetime',
        'fecha_registro' => 'datetime',
        'impreso' => 'boolean',
    ];

    public function receptor()
    {
        return $this->belongsTo(User::class, 'receptor_id');
    }

    public function registro()
    {
        return $this->belongsTo(RegistrosScrap::class, 'registro_scrap_id');
    }

    // Scopes
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