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
                'username' => '.\admin',
                'name' => 'Administrador Principal',
                'password' => Hash::make('M@ster2018mx'),
                'role' => 'admin',
            ],
            [
                'username' => 'operador1',
                'name' => 'Operador de Logística 1',
                'password' => Hash::make('operador123'),
                'role' => 'operador',
            ],
            [
                'username' => 'receptor1',
                'name' => 'Receptor de Scrap 1',
                'password' => Hash::make('receptor123'),
                'role' => 'receptor',
            ],
            [
                'name' => 'CUAHUTEMOC CAMARGO LOPEZ',
                'username' => 'temoc',
                'password' => Hash::make('temoc1106'),
                'role' => 'operador',
            ],
            [
                'name' => 'ERICK ALEJANDRO SIGALA RIVAS',
                'username' => 'erick.sigala',
                'password' => Hash::make('erick30173'),
                'role' => 'operador',
            ],
            [
                'name' => 'ANGEL FEDERICO GONZALEZ LOPEZ',
                'username' => 'angel.gonzalez',
                'password' => Hash::make('angel4219'),
                'role' => 'operador',
            ],
            [
                'name' => 'ISRAEL VAZQUEZ HERNANDEZ',
                'username' => 'israel.vazquez',
                'password' => Hash::make('israel2980'),
                'role' => 'operador',
            ],
            [
                'name' => 'DANIEL CHAVEZ FRAUSTO',
                'username' => 'daniel.chavez',
                'password' => Hash::make('daniel30171'),
                'role' => 'operador',
            ],
            [
                'name' => 'MIGUEL HERNANDEZ PARRA',
                'username' => 'miguel.hernandez',
                'password' => Hash::make('miguel3960'),
                'role' => 'operador',
            ],
            [
                'name' => 'GERARDO ZAPATA HERRERA',
                'username' => 'gerardo.zapata',
                'password' => Hash::make('gerardo4287'),
                'role' => 'operador',
            ],
            [
                'name' => 'LINO MANUEL GUERECA PEREZ',
                'username' => 'lino.guereca',
                'password' => Hash::make('lino30200'),
                'role' => 'operador',
            ],
            [
                'name' => 'ROBERTO HERNANDEZ CRUZ',
                'username' => 'roberto.hernadez',
                'password' => Hash::make('roberto2285'),
                'role' => 'operador',
            ],
            [
                'name' => 'MARCO ANTONIO GARCIA BARRON',
                'username' => 'marco.garcia',
                'password' => Hash::make('marco149'),
                'role' => 'operador',
            ],
            [
                'name' => 'MARTIN ROMERO LOPEZ',
                'username' => 'martin.romero',
                'password' => Hash::make('martin30144'),
                'role' => 'operador',
            ],
            [
                'name' => 'IVAN REVILLA',
                'username' => 'ivan.revilla',
                'password' => Hash::make('ivan1098'),
                'role' => 'operador',
            ],
            [
                'name' => 'DANIEL JIMENEZ RAMIREZ',
                'username' => 'daniel.jimenez',
                'password' => Hash::make('daniel2274'),
                'role' => 'operador',
            ],
        ]);
    }
}