<?php
/* database/migrations/2024_01_04_create_registros_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('registros_scrap', function (Blueprint $table) {
            $table->id();
            
            // --- Datos de Cabecera del Formato ---
            $table->foreignId('operador_id')->constrained('users'); // "Operador de Logística"
            $table->enum('turno', [1, 2, 3]);
            $table->string('area_real');    // Ej: TREFILADO
            $table->string('maquina_real'); // Ej: TREF 1
            
            // --- COLUMNAS EXACTAS DEL PDF (Tipos de Material) ---
            // Usamos decimal(10,3) para precisión de gramos (ej: 0.500 kg)
            
            // 1. Metales
            $table->decimal('peso_cobre', 10, 3)->default(0);          // Columna: COBRE
            $table->decimal('peso_cobre_estanado', 10, 3)->default(0); // Columna: cobre estañado
            
            // 2. Purgas
            $table->decimal('peso_purga_pvc', 10, 3)->default(0);
            $table->decimal('peso_purga_pe', 10, 3)->default(0);
            $table->decimal('peso_purga_pur', 10, 3)->default(0);
            $table->decimal('peso_purga_pp', 10, 3)->default(0);
            
            // 3. Cables
            $table->decimal('peso_cable_pvc', 10, 3)->default(0);
            $table->decimal('peso_cable_pe', 10, 3)->default(0);
            $table->decimal('peso_cable_pur', 10, 3)->default(0);
            $table->decimal('peso_cable_pp', 10, 3)->default(0);
            $table->decimal('peso_cable_aluminio', 10, 3)->default(0);
            $table->decimal('peso_cable_estanado_pvc', 10, 3)->default(0); // PDF dice FVC (asumimos PVC)
            $table->decimal('peso_cable_estanado_pe', 10, 3)->default(0);
            
            // --- Totales y Control ---
            $table->decimal('peso_total', 10, 3)->default(0); // Suma de la fila (Columna TOTAL del PDF)
            
            // Campos de sistema (independientes del PDF visual)
            $table->boolean('completo')->default(true);
            $table->boolean('conexion_bascula')->default(false);
            $table->string('numero_lote')->nullable();
            $table->text('observaciones')->nullable();
            
            // Fecha real del registro (para el campo FECHA del PDF)
            $table->timestamp('fecha_registro')->useCurrent();
            $table->timestamps();
            
            // Índices para reportes rápidos
            $table->index(['area_real', 'maquina_real']);
            $table->index(['turno', 'fecha_registro']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('registros_scrap');
    }
};