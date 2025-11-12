<?php
// app/Models/StockScrap.php - MEJORADO para manejar Lotes/HU
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Builder; // Agregado para tipar scopes

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
        'ultimo_movimiento',
        'recepcion_id' 
    ];

    protected $casts = [
        'fecha_ingreso' => 'datetime',
        'ultimo_movimiento' => 'datetime',
    ];

    public function recepcion()
    {
        return $this->belongsTo(RecepcionesScrap::class, 'recepcion_id');
    }

    public function trazabilidad()
    {
        return $this->hasMany(StockMovimiento::class, 'stock_id');
    }

    /**
     * @param Builder $query
     */
    public function scopeDisponible(Builder $query): Builder
    {
        return $query->where('estado', 'disponible')->where('cantidad_kg', '>', 0);
    }

    /**
     * @param Builder $query
     * @param string $tipoMaterial
     */
    public function scopePorTipoMaterial(Builder $query, string $tipoMaterial): Builder
    {
        return $query->where('tipo_material', $tipoMaterial);
    }

    /**
     * @param Builder $query
     * @param string $ubicacion
     */
    public function scopePorUbicacion(Builder $query, string $ubicacion): Builder
    {
        return $query->where('ubicacion', $ubicacion);
    }

    // MÉTODO DE CREACIÓN DE LOTE (sin cambios lógicos)
    public static function crearNuevoLote(
        $tipoMaterial, 
        $cantidad, 
        $ubicacion, 
        $hu, 
        $origenTipo, 
        $origenEspecifico,
        $recepcionId
    )
    {
        $stock = self::create([
            'tipo_material' => $tipoMaterial,
            'cantidad_kg' => $cantidad,
            'numero_hu' => $hu,
            'ubicacion' => $ubicacion,
            'origen_tipo' => $origenTipo,
            'origen_especifico' => $origenEspecifico,
            'recepcion_id' => $recepcionId,
            'estado' => 'disponible',
            'fecha_ingreso' => now(),
            'ultimo_movimiento' => now(),
        ]);
        
        StockMovimiento::create([
            'stock_id' => $stock->id,
            'tipo_movimiento' => 'ingreso',
            'cantidad' => $cantidad,
            'cantidad_anterior' => 0,
            'cantidad_nueva' => $cantidad,
            'motivo' => 'recepcion',
            'usuario_id' => auth()->id(),
            'referencia_id' => $recepcionId,
            'referencia_tipo' => RecepcionesScrap::class
        ]);

        return $stock;
    }

    // Método para actualizar stock (sin cambios lógicos)
    public function actualizarStock($cantidad, $operacion = 'suma', $motivo = 'ajuste', $referenciaId = null, $referenciaTipo = null)
    {
        $cantidadAnterior = $this->cantidad_kg;

        if ($operacion === 'suma') {
            $this->cantidad_kg += $cantidad;
        } else {
            $this->cantidad_kg -= $cantidad;
        }

        $this->ultimo_movimiento = now();

        StockMovimiento::create([
            'stock_id' => $this->id,
            'tipo_movimiento' => $operacion,
            'cantidad' => $cantidad,
            'cantidad_anterior' => $cantidadAnterior,
            'cantidad_nueva' => $this->cantidad_kg,
            'motivo' => $motivo,
            'usuario_id' => auth()->id(),
            'referencia_id' => $referenciaId,
            'referencia_tipo' => $referenciaTipo
        ]);

        if ($this->cantidad_kg <= 0) {
            $this->estado = 'procesado';
            $this->cantidad_kg = 0;
        }

        return $this->save();
    }
    
    // Método para obtener stock por ubicación (sin cambios lógicos)
    public static function getStockPorUbicacion()
    {
        return self::disponible()
            ->selectRaw('ubicacion, tipo_material, SUM(cantidad_kg) as cantidad_total')
            ->groupBy('ubicacion', 'tipo_material')
            ->get()
            ->groupBy('ubicacion');
    }
}