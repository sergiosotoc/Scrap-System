<?php
// database/migrations/2024_01_06_create_stock_scrap_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_scrap', function (Blueprint $table) {
            $table->id();
            $table->string('tipo_material');
            $table->decimal('cantidad_kg', 10, 2)->default(0);
            $table->string('ubicacion')->nullable();
            $table->string('numero_hu')->nullable();
            $table->enum('estado', ['disponible', 'procesado', 'vendido'])->default('disponible');
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