<?php
// app/Models/RegistrosScrap.php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class RegistrosScrap extends Model
{
    protected $table = 'registros_scrap';
    
    protected $fillable = [
        'operador_id', 
        'turno', 
        'area_real', 
        'maquina_real', 
        'tipo_material',
        'tipo_scrap_detallado',
        
        'peso_cobre',
        'peso_cobre_estanado', 
        'peso_purga_pvc', 
        'peso_purga_pe', 
        'peso_purga_pur', 
        'peso_purga_pp', 
        'peso_cable_pvc',
        'peso_cable_pe', 
        'peso_cable_pur', 
        'peso_cable_pp', 
        'peso_cable_aluminio',
        'peso_cable_estanado_pvc', 
        'peso_cable_estanado_pe', 
        
        'peso_total',
        'completo', 
        'conexion_bascula', 
        'numero_lote', 
        'fecha_registro',
        'observaciones'
    ];

    protected $casts = [
        'peso_total' => 'decimal:3', // 3 decimales
        'completo' => 'boolean',
        'conexion_bascula' => 'boolean',
        'fecha_registro' => 'datetime',
    ];

    public function operador()
    {
        return $this->belongsTo(User::class, 'operador_id');
    }

    // Scopes para consultas comunes
    public function scopePorArea($query, $area)
    {
        return $query->where('area_real', $area);
    }

    public function scopePorMaquina($query, $maquina)
    {
        return $query->where('maquina_real', $maquina);
    }

    public function scopePorTurno($query, $turno)
    {
        return $query->where('turno', $turno);
    }

    public function scopeConBascula($query)
    {
        return $query->where('conexion_bascula', true);
    }

    // Calcular total automáticamente
    public function calcularTotal()
    {
        $total = $this->peso_cobre_estanado + $this->peso_purga_pvc + $this->peso_purga_pe +
               $this->peso_purga_pur + $this->peso_purga_pp + $this->peso_cable_pvc +
               $this->peso_cable_pe + $this->peso_cable_pur + $this->peso_cable_pp +
               $this->peso_cable_aluminio + $this->peso_cable_estanado_pvc + $this->peso_cable_estanado_pe;
        
        $this->peso_total = $total;
        return $total;
    }
}