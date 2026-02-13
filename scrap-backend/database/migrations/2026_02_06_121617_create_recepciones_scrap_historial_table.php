// database/migrations/[timestamp]_create_recepciones_scrap_historial_table.php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('recepciones_scrap_historial', function (Blueprint $table) {
            $table->id();
            $table->foreignId('recepcion_id')->constrained('recepciones_scrap')->onDelete('cascade');
            $table->enum('tipo_movimiento', ['create', 'update', 'delete']);
            $table->string('campo_modificado')->nullable();
            $table->text('valor_anterior')->nullable();
            $table->text('valor_nuevo')->nullable();
            $table->text('observaciones')->nullable();
            $table->string('responsable');
            $table->string('rol')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            $table->timestamps();
            
            $table->index('recepcion_id');
            $table->index('tipo_movimiento');
            $table->index('campo_modificado');
            $table->index('created_at');
            $table->index('responsable');
        });
    }

    public function down()
    {
        Schema::dropIfExists('recepciones_scrap_historial');
    }
};