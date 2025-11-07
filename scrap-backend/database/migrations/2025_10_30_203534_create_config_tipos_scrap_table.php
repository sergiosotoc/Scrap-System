<?php
// database/migrations/2024_01_03_create_config_tipos_scrap_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('config_tipos_scrap', function (Blueprint $table) {
            $table->id();
            $table->string('categoria'); // COBRE, ALUMINIO, CABLE ESTAÑADO
            $table->string('tipo_nombre'); // cobre estañado, PURGA PVC, etc.
            $table->string('columna_db'); // nombre de columna en registros_scrap
            $table->integer('orden')->default(0);
            $table->boolean('activo')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('config_tipos_scrap');
    }
};