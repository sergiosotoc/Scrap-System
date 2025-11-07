<?php
// database/migrations/2024_01_02_create_config_areas_maquinas_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('config_areas_maquinas', function (Blueprint $table) {
            $table->id();
            $table->string('area_nombre');
            $table->string('maquina_nombre');
            $table->integer('orden')->default(0);
            $table->boolean('activa')->default(true);
            $table->timestamps();
            
            $table->unique(['area_nombre', 'maquina_nombre']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('config_areas_maquinas');
    }
};