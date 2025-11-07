<?php
// database/migrations/2024_01_04_create_registros_scrap_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_scrap', function (Blueprint $table) {
            $table->id();
            
            // Información básica
            $table->foreignId('operador_id')->constrained('users');
            $table->enum('turno', [1, 2, 3]);
            $table->string('area_real');
            $table->string('maquina_real');
            $table->string('tipo_material')->default('mixto');
            $table->string('tipo_scrap_detallado')->default('registro_completo');
            
            // Pesos específicos por tipo de scrap (basado en el PDF)
            $table->decimal('peso_cobre_estanado', 10, 2)->default(0);
            $table->decimal('peso_purga_pvc', 10, 2)->default(0);
            $table->decimal('peso_purga_pe', 10, 2)->default(0);
            $table->decimal('peso_purga_pur', 10, 2)->default(0);
            $table->decimal('peso_purga_pp', 10, 2)->default(0);
            $table->decimal('peso_cable_pvc', 10, 2)->default(0);
            $table->decimal('peso_cable_pe', 10, 2)->default(0);
            $table->decimal('peso_cable_pur', 10, 2)->default(0);
            $table->decimal('peso_cable_pp', 10, 2)->default(0);
            $table->decimal('peso_cable_aluminio', 10, 2)->default(0);
            $table->decimal('peso_cable_estanado_pvc', 10, 2)->default(0);
            $table->decimal('peso_cable_estanado_pe', 10, 2)->default(0);
            
            // Total calculado
            $table->decimal('peso_total', 10, 2)->default(0);
            
            // Control y estado
            $table->enum('estado', ['pendiente', 'recibido'])->default('pendiente');
            $table->boolean('completo')->default(true);
            $table->boolean('conexion_bascula')->default(false);
            $table->string('numero_lote')->nullable();
            
            // Fechas
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamps();
            
            // Índices para mejor performance
            $table->index(['area_real', 'maquina_real']);
            $table->index(['turno', 'fecha_registro']);
            $table->index('estado');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_scrap');
    }
};