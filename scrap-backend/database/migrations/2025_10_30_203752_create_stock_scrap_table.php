<?php
/* database/migrations/2024_01_06_create_stock_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_scrap', function (Blueprint $table) {
            $table->id();
            
            // Qué es y cuánto hay
            $table->string('tipo_material');
            $table->decimal('cantidad_kg', 10, 3)->default(0);
            
            // Dónde está y cómo se identifica
            $table->string('ubicacion')->nullable();
            $table->string('numero_hu')->nullable()->unique(); // Etiqueta generada por el Receptor
            
            // Estado del material
            $table->enum('estado', ['disponible', 'procesado', 'vendido'])->default('disponible');
            
            // Tiempos (sin trazabilidad de origen)
            $table->timestamp('fecha_ingreso')->useCurrent();
            $table->timestamp('ultimo_movimiento')->useCurrent();
            $table->timestamps();
            
            $table->index('tipo_material');
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_scrap');
    }
};