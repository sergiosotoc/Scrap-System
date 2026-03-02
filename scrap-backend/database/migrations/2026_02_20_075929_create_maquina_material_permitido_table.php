<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('maquina_material_permitido', function (Blueprint $table) {
            $table->id();
            // Relación con la tabla de configuración de máquinas
            $table->foreignId('config_area_maquina_id')
                  ->constrained('config_areas_maquinas')
                  ->onDelete('cascade');
            
            // Relación con la tabla de tipos de scrap
            $table->foreignId('config_tipo_scrap_id')
                  ->constrained('config_tipos_scrap')
                  ->onDelete('cascade');
                  
            $table->timestamps();
            
            // Evitar duplicados: Una máquina no puede tener el mismo material asignado dos veces
            $table->unique(['config_area_maquina_id', 'config_tipo_scrap_id'], 'maquina_material_unique');
        });
    }

    public function down()
    {
        Schema::dropIfExists('maquina_material_permitido');
    }
};