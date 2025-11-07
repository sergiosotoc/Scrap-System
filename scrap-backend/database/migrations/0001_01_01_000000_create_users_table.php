<?php
// database/migrations/2024_01_01_create_users_table.php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->string('username')->unique();
            $table->string('name');
            $table->string('password');
            $table->enum('role', ['admin', 'operador', 'receptor'])->default('operador');
            $table->boolean('activo')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });

        // NO eliminar las tablas de sessions - mantener compatibilidad
        // Solo eliminar password_reset_tokens si no se usa
        Schema::dropIfExists('password_reset_tokens');
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        
        // Recrear password_reset_tokens si es necesario
        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });
    }
};