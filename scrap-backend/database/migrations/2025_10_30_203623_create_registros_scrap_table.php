<?php
/* database/migrations/2025_10_30_203623_create_registros_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Cabecera del Registro del Operador
        // NOTA: Se eliminaron las columnas fijas (peso_cobre, etc) para usar el modelo dinámico
        Schema::create('registros_scrap', function (Blueprint $table) {
            $table->id();
            
            $table->foreignId('operador_id')->constrained('users');
            $table->enum('turno', [1, 2, 3]);
            $table->string('area_real');
            $table->string('maquina_real');
            
            // Total calculado (suma de los detalles)
            $table->decimal('peso_total', 10, 3)->default(0);
            
            $table->boolean('completo')->default(true);
            $table->boolean('conexion_bascula')->default(false);
            $table->text('observaciones')->nullable();
            
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamps();
            
            $table->index(['area_real', 'maquina_real']);
            $table->index(['turno', 'fecha_registro']);
        });

        // 2. [NUEVA TABLA] Detalles del Registro (Modelo Dinámico)
        // Permite agregar N materiales a un registro sin modificar la BD
        Schema::create('registro_scrap_detalles', function (Blueprint $table) {
            $table->id();
            
            // Relación con el registro padre
            $table->foreignId('registro_id')->constrained('registros_scrap')->onDelete('cascade');
            
            // Relación con el tipo de material (Catálogo)
            $table->foreignId('tipo_scrap_id')->constrained('config_tipos_scrap');
            
            $table->decimal('peso', 10, 3)->default(0);
            
            $table->timestamps();
            
            $table->index('registro_id');
            $table->index('tipo_scrap_id');
        });

        // 3. Recepciones de Scrap
        Schema::create('recepciones_scrap', function (Blueprint $table) {
            $table->id();
            
            $table->string('numero_hu')->unique();
            $table->decimal('peso_kg', 10, 3);
            
            // Referencia al catálogo de materiales
            $table->string('tipo_material'); // Nombre textual (Legacy/Visual)
            $table->foreignId('tipo_scrap_id')->nullable()->constrained('config_tipos_scrap');
            
            $table->enum('origen_tipo', ['interna', 'externa'])->default('interna');
            $table->string('origen_especifico')->nullable();
            
            $table->foreignId('receptor_id')->constrained('users');
            
            $table->enum('destino', ['reciclaje', 'venta', 'almacenamiento']);
            $table->string('lugar_almacenamiento')->nullable();
            
            $table->text('observaciones')->nullable();
            $table->boolean('impreso')->default(false);
            
            $table->timestamp('fecha_entrada')->useCurrent();
            $table->timestamps();
            
            $table->index('destino');
            $table->index('fecha_entrada');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('recepciones_scrap');
        Schema::dropIfExists('registro_scrap_detalles');
        Schema::dropIfExists('registros_scrap');
    }
};