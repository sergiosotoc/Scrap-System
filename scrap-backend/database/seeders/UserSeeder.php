<?php
// database/seeders/UserSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        DB::table('users')->insert([
            [
                'username' => 'admin',
                'name' => 'Administrador del Sistema',
                'password' => Hash::make('scrap2025'),
                'role' => 'admin',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'operador1',
                'name' => 'Operador de Logística 1',
                'password' => Hash::make('operador123'),
                'role' => 'operador',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'username' => 'receptor1',
                'name' => 'Receptor de Scrap 1',
                'password' => Hash::make('receptor123'),
                'role' => 'receptor',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}