<?php
/* database/migrations/2024_01_15_update_stock_scrap_table.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_scrap', function (Blueprint $table) {
            // ✅ AGREGAR LUGAR DE ALMACENAMIENTO AQUÍ (si no existe)
            if (!Schema::hasColumn('stock_scrap', 'ubicacion')) {
                $table->string('ubicacion')->nullable()
                      ->comment('Ubicación física del material en almacén');
            }
            
            // ✅ HACER CAMPOS MÁS ESPECÍFICOS
            $table->string('numero_hu')->nullable()->change();
            $table->foreignId('recepcion_id')->nullable()->change();
            
            // ✅ AGREGAR ÍNDICES
            $table->index('tipo_material');
            $table->index('ubicacion');
            $table->index('estado');
            $table->index('fecha_ingreso');
            
            // ❌ ELIMINAR CAMPOS REDUNDANTES (si existen)
            $columnsToCheck = ['observaciones', 'lote_proveedor', 'proveedor_id'];
            foreach ($columnsToCheck as $column) {
                if (Schema::hasColumn('stock_scrap', $column)) {
                    $table->dropColumn($column);
                }
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_scrap', function (Blueprint $table) {
            // Revertir cambios si es necesario
            $table->dropIndex(['tipo_material']);
            $table->dropIndex(['ubicacion']);
            $table->dropIndex(['estado']);
            $table->dropIndex(['fecha_ingreso']);
            
            if (Schema::hasColumn('stock_scrap', 'ubicacion')) {
                $table->dropColumn('ubicacion');
            }
        });
    }
};