<?php
/* database/migrations/2025_10_30_203440_create_config_areas_maquinas_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Áreas y Máquinas
        Schema::create('config_areas_maquinas', function (Blueprint $table) {
            $table->id();
            $table->string('area_nombre');
            $table->string('maquina_nombre');
            $table->integer('orden')->default(0);
            $table->boolean('activa')->default(true);
            $table->timestamps();
            
            $table->unique(['area_nombre', 'maquina_nombre']);
        });

        // 2. Tipos de Scrap (Materiales) - ESTRUCTURA DINÁMICA
        Schema::create('config_tipos_scrap', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_nombre'); // Ej: Cobre Estañado, Cartón
            
            // Define quién usa este material: operador, receptor o ambos
            $table->enum('uso', ['operador', 'receptor', 'ambos'])->default('operador');
            
            // Nullable porque los materiales nuevos no tendrán columna física
            $table->string('columna_db')->nullable(); 
            
            $table->integer('orden')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('config_tipos_scrap');
        Schema::dropIfExists('config_areas_maquinas');
    }
};