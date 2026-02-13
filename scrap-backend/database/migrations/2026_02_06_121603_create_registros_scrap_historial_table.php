<?php
// database/migrations/[timestamp]_create_registros_scrap_historial_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('registros_scrap_historial', function (Blueprint $table) {
            $table->id();
            $table->foreignId('registro_id')->constrained('registros_scrap')->onDelete('cascade');
            $table->enum('tipo_movimiento', ['create', 'update', 'delete', 'batch_create']);
            $table->string('campo_modificado')->nullable();
            $table->text('valor_anterior')->nullable();
            $table->text('valor_nuevo')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('responsable');
            $table->string('rol')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index('registro_id');
            $table->index('tipo_movimiento');
            $table->index('campo_modificado');
            $table->index('created_at');
            $table->index('responsable');
        });
    }

    public function down()
    {
        Schema::dropIfExists('registros_scrap_historial');
    }
};