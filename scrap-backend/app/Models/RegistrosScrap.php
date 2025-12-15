<?php
// app/Models/RegistrosScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegistrosScrap extends Model
{
    use HasFactory;

    protected $table = 'registros_scrap';
    
    protected $fillable = [
        'operador_id', 
        'turno', 
        'area_real', 
        'maquina_real', 
        'peso_total', 
        'conexion_bascula', 
        'observaciones', 
        'fecha_registro'
    ];

    protected $casts = [
        'peso_total' => 'decimal:3',
        'conexion_bascula' => 'boolean',
        'fecha_registro' => 'datetime',
    ];

    public function operador()
    {
        return $this->belongsTo(User::class, 'operador_id');
    }

    /**
     * Relación con los detalles (materiales pesados individualmente)
     */
    public function detalles()
    {
        return $this->hasMany(RegistroScrapDetalle::class, 'registro_id');
    }

    /**
     * Helper para obtener peso por nombre de material (para Excel)
     */
    public function getPesoPorTipo($nombreMaterial)
    {
        // Busca en la colección de detalles cargada en memoria
        $detalle = $this->detalles->first(function ($detalle) use ($nombreMaterial) {
            return $detalle->tipoScrap && strtoupper($detalle->tipoScrap->tipo_nombre) === strtoupper($nombreMaterial);
        });

        return $detalle ? $detalle->peso : 0;
    }
}