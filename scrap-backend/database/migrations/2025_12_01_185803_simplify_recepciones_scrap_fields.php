<?php
/* database/migrations/2025_12_01_XXXXXX_simplify_recepciones_scrap_fields.php */
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // SOLO hacer cambios seguros
        
        // 1. Verificar y eliminar 'lugar_almacenamiento' si existe
        if (Schema::hasColumn('recepciones_scrap', 'lugar_almacenamiento')) {
            Schema::table('recepciones_scrap', function (Blueprint $table) {
                $table->dropColumn('lugar_almacenamiento');
            });
        }
        
        // 2. Verificar y eliminar 'observaciones' si existe
        if (Schema::hasColumn('recepciones_scrap', 'observaciones')) {
            Schema::table('recepciones_scrap', function (Blueprint $table) {
                $table->dropColumn('observaciones');
            });
        }
        
        // 3. Agregar índices básicos (opcional pero recomendado)
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // Índices para búsquedas frecuentes en React
            if (!Schema::hasIndex('recepciones_scrap', 'idx_rcp_tipo')) {
                $table->index('tipo_material', 'idx_rcp_tipo');
            }
            
            if (!Schema::hasIndex('recepciones_scrap', 'idx_rcp_fecha')) {
                $table->index('fecha_entrada', 'idx_rcp_fecha');
            }
            
            if (!Schema::hasIndex('recepciones_scrap', 'idx_rcp_destino')) {
                $table->index('destino', 'idx_rcp_destino');
            }
        });
    }

    public function down(): void
    {
        // Restaurar campos si es necesario
        Schema::table('recepciones_scrap', function (Blueprint $table) {
            // Eliminar índices
            $table->dropIndexIfExists('idx_rcp_tipo');
            $table->dropIndexIfExists('idx_rcp_fecha');
            $table->dropIndexIfExists('idx_rcp_destino');
            
            // Restaurar campos (opcional)
            $table->string('lugar_almacenamiento')->nullable();
            $table->text('observaciones')->nullable();
        });
    }
};