<?php
// app/Models/StockScrap.php - MEJORADO
namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockScrap extends Model
{
    protected $table = 'stock_scrap';
    
    protected $fillable = [
        'tipo_material', 
        'cantidad_kg', 
        'ubicacion', 
        'numero_hu', 
        'estado',
        'origen_tipo',
        'origen_especifico',
        'fecha_ingreso',
        'ultimo_movimiento'
    ];

    protected $casts = [
        'fecha_ingreso' => 'datetime',
        'ultimo_movimiento' => 'datetime',
    ];

    public function scopeDisponible($query)
    {
        return $query->where('estado', 'disponible');
    }

    public function scopePorTipoMaterial($query, $tipoMaterial)
    {
        return $query->where('tipo_material', $tipoMaterial);
    }

    public function scopePorUbicacion($query, $ubicacion)
    {
        return $query->where('ubicacion', $ubicacion);
    }

    // Trazabilidad: Obtener historial completo del material
    public function trazabilidad()
    {
        return $this->hasMany(StockMovimiento::class, 'stock_id');
    }

    // Método mejorado para actualizar stock
    public function actualizarStock($cantidad, $operacion = 'suma', $motivo = 'ajuste')
    {
        $cantidadAnterior = $this->cantidad_kg;

        if ($operacion === 'suma') {
            $this->cantidad_kg += $cantidad;
        } else {
            $this->cantidad_kg -= $cantidad;
        }

        $this->ultimo_movimiento = now();

        // Registrar movimiento
        StockMovimiento::create([
            'stock_id' => $this->id,
            'tipo_movimiento' => $operacion,
            'cantidad' => $cantidad,
            'cantidad_anterior' => $cantidadAnterior,
            'cantidad_nueva' => $this->cantidad_kg,
            'motivo' => $motivo,
            'usuario_id' => auth()->id(),
        ]);

        // Si la cantidad llega a 0, marcar como procesado
        if ($this->cantidad_kg <= 0) {
            $this->estado = 'procesado';
        }

        return $this->save();
    }

    public static function actualizarStockGlobal($tipoMaterial, $cantidad, $operacion = 'suma', $hu = null, $ubicacion = null)
    {
        $stock = self::where('tipo_material', $tipoMaterial)
                    ->where('estado', 'disponible')
                    ->first();

        if (!$stock) {
            return self::create([
                'tipo_material' => $tipoMaterial,
                'cantidad_kg' => $cantidad,
                'numero_hu' => $hu,
                'ubicacion' => $ubicacion,
                'estado' => 'disponible',
                'fecha_ingreso' => now(),
                'ultimo_movimiento' => now(),
            ]);
        }

        return $stock->actualizarStock($cantidad, $operacion, 'recepcion');
    }

    // Método para obtener stock por ubicación
    public static function getStockPorUbicacion()
    {
        return self::disponible()
            ->selectRaw('ubicacion, tipo_material, SUM(cantidad_kg) as cantidad_total')
            ->groupBy('ubicacion', 'tipo_material')
            ->get()
            ->groupBy('ubicacion');
    }
}