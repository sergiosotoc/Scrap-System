<?php
/* database/migrations/2024_01_05_create_recepciones_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recepciones_scrap', function (Blueprint $table) {
            $table->id();
            
            // Identificación única de la etiqueta
            $table->string('numero_hu')->unique();
            
            // Datos de la recepción
            $table->decimal('peso_kg', 10, 3);
            $table->string('tipo_material');
            
            // Datos informativos
            $table->enum('origen_tipo', ['interna', 'externa'])->default('interna');
            $table->string('origen_especifico')->nullable(); // Ej: Planta 2, Proveedor X
            
            // Quién recibió
            $table->foreignId('receptor_id')->constrained('users');
            
            // A dónde va
            $table->enum('destino', ['reciclaje', 'venta', 'almacenamiento']);
            $table->string('lugar_almacenamiento')->nullable();
            
            // Información adicional
            $table->text('observaciones')->nullable();
            $table->boolean('impreso')->default(false);
            
            // Fechas
            $table->timestamp('fecha_entrada')->useCurrent();
            $table->timestamps();
            
            // Índices para búsquedas rápidas
            $table->index('tipo_material');
            $table->index('destino');
            $table->index('fecha_entrada');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recepciones_scrap');
    }
};