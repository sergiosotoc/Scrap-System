<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovimiento extends Model
{
    protected $table = 'stock_movimientos';

    protected $fillable = [
        'stock_id',
        'tipo_movimiento',
        'cantidad',
        'cantidad_anterior',
        'cantidad_nueva',
        'motivo',
        'usuario_id',
        'referencia_id',
        'referencia_tipo'
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    public function stock()
    {
        return $this->belongsTo(StockScrap::class, 'stock_id');
    }

    public function usuario()
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }

    public function referencia()
    {
        return $this->morphTo();
    }
}