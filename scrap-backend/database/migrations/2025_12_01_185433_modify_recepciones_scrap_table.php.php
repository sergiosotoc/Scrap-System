<?php
/* database/migrations/2025_12_01_185433_modify_recepciones_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // 1. PRIMERO: Crear la columna temporal
            $table->string('destino_temp')->nullable()->after('destino');
        });
        
        // 2. SEGUNDO: Copiar los datos a la columna temporal
        DB::statement('UPDATE recepciones_scrap SET destino_temp = destino');
        
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // 3. TERCERO: Eliminar la columna original
            $table->dropColumn('destino');
            
            // 4. CUARTO: Crear la nueva columna con el orden correcto
            $table->enum('destino', ['almacenamiento', 'reciclaje', 'venta'])
                  ->default('almacenamiento')
                  ->after('origen_especifico');
        });
        
        // 5. QUINTO: Restaurar los datos
        DB::statement('UPDATE recepciones_scrap SET destino = destino_temp');
        
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // 6. SEXTO: Eliminar la columna temporal
            $table->dropColumn('destino_temp');
            
            // 7. SÉPTIMO: ELIMINAR CAMPOS QUE NO SE USAN
            if (Schema::hasColumn('recepciones_scrap', 'lugar_almacenamiento')) {
                $table->dropColumn('lugar_almacenamiento');
            }
            
            if (Schema::hasColumn('recepciones_scrap', 'observaciones')) {
                $table->dropColumn('observaciones');
            }
            
            // 8. OCTAVO: AGREGAR ÍNDICES
            $indices = [
                'idx_recepciones_tipo_material' => 'tipo_material',
                'idx_recepciones_origen_tipo' => 'origen_tipo',
                'idx_recepciones_destino' => 'destino',
                'idx_recepciones_fecha_entrada' => 'fecha_entrada',
                'idx_recepciones_receptor_id' => 'receptor_id',
                'idx_recepciones_impreso' => 'impreso',
                'idx_recepciones_created_at' => 'created_at',
            ];
            
            foreach ($indices as $nombre => $columna) {
                if (!Schema::hasIndex('recepciones_scrap', $nombre)) {
                    $table->index($columna, $nombre);
                }
            }
            
            // 9. NOVENO: ÍNDICES COMPUESTOS
            if (!Schema::hasIndex('recepciones_scrap', 'idx_recepciones_tipo_fecha')) {
                $table->index(['tipo_material', 'fecha_entrada'], 'idx_recepciones_tipo_fecha');
            }
            
            if (!Schema::hasIndex('recepciones_scrap', 'idx_recepciones_origen_destino')) {
                $table->index(['origen_tipo', 'destino'], 'idx_recepciones_origen_destino');
            }
        });
    }

    public function down(): void
    {
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // 1. Revertir índices
            $table->dropIndexIfExists('idx_recepciones_tipo_material');
            $table->dropIndexIfExists('idx_recepciones_origen_tipo');
            $table->dropIndexIfExists('idx_recepciones_destino');
            $table->dropIndexIfExists('idx_recepciones_fecha_entrada');
            $table->dropIndexIfExists('idx_recepciones_receptor_id');
            $table->dropIndexIfExists('idx_recepciones_impreso');
            $table->dropIndexIfExists('idx_recepciones_created_at');
            $table->dropIndexIfExists('idx_recepciones_tipo_fecha');
            $table->dropIndexIfExists('idx_recepciones_origen_destino');
            
            // 2. Restaurar campos eliminados
            $table->string('lugar_almacenamiento')->nullable();
            $table->text('observaciones')->nullable();
            
            // 3. Revertir el enum de destino (similar proceso inverso)
            $table->string('destino_temp')->nullable();
        });
        
        DB::statement('UPDATE recepciones_scrap SET destino_temp = destino');
        
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            $table->dropColumn('destino');
            $table->enum('destino', ['reciclaje', 'venta', 'almacenamiento'])
                  ->default('almacenamiento');
        });
        
        DB::statement('UPDATE recepciones_scrap SET destino = destino_temp');
        
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            $table->dropColumn('destino_temp');
        });
    }
};