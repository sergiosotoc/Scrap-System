<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('stock_movimientos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('stock_id')->constrained('stock_scrap')->onDelete('cascade');
            $table->enum('tipo_movimiento', ['suma', 'resta']);
            $table->decimal('cantidad', 10, 2);
            $table->decimal('cantidad_anterior', 10, 2);
            $table->decimal('cantidad_nueva', 10, 2);
            $table->string('motivo');
            $table->foreignId('usuario_id')->constrained('users');
            $table->morphs('referencia'); // Para relacionar con recepciones, ventas, etc.
            $table->timestamps();
            
            $table->index(['stock_id', 'created_at']);
        });
    }

    public function down()
    {
        Schema::dropIfExists('stock_movimientos');
    }
    
};
