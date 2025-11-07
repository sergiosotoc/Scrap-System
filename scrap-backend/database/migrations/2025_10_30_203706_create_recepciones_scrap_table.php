<?php
// database/migrations/2024_01_05_create_recepciones_scrap_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('recepciones_scrap', function (Blueprint $table) {
            $table->id();
            
            // Identificación única
            $table->string('numero_hu')->unique();
            
            // Información del material
            $table->decimal('peso_kg', 10, 2);
            $table->string('tipo_material');
            $table->enum('origen_tipo', ['interna', 'externa']);
            $table->string('origen_especifico');
            
            // Relaciones
            $table->foreignId('registro_scrap_id')->nullable()->constrained('registros_scrap');
            $table->foreignId('receptor_id')->constrained('users');
            
            // Destino y ubicación
            $table->enum('destino', ['reciclaje', 'venta', 'almacenamiento']);
            $table->string('lugar_almacenamiento')->nullable();
            
            // Control e información adicional
            $table->text('observaciones')->nullable();
            $table->boolean('impreso')->default(false);
            
            // Fechas
            $table->timestamp('fecha_entrada')->useCurrent();
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamps();
            
            // Índices
            $table->index('numero_hu');
            $table->index(['origen_tipo', 'fecha_entrada']);
            $table->index('destino');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recepciones_scrap');
    }
};