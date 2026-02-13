<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Modificar el ENUM para agregar 'suma'
        DB::statement("ALTER TABLE registros_scrap_historial MODIFY COLUMN tipo_movimiento ENUM('create', 'update', 'delete', 'batch_create', 'suma', 'create_manual') NOT NULL");
        
        // También para recepciones si es necesario
        DB::statement("ALTER TABLE recepciones_scrap_historial MODIFY COLUMN tipo_movimiento ENUM('create', 'update', 'delete', 'suma') NOT NULL");
    }

    public function down(): void
    {
        // Revertir a los valores originales (sin 'suma' y 'create_manual')
        DB::statement("ALTER TABLE registros_scrap_historial MODIFY COLUMN tipo_movimiento ENUM('create', 'update', 'delete', 'batch_create') NOT NULL");
        DB::statement("ALTER TABLE recepciones_scrap_historial MODIFY COLUMN tipo_movimiento ENUM('create', 'update', 'delete') NOT NULL");
    }
};