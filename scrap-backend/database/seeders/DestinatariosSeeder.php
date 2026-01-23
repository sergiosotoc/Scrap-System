<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DestinatariosSeeder extends Seeder
{
    public function run(): void
    {
        $destinatarios = [
            ['nombre' => 'Luis VAZQUEZ', 'email' => 'luis.vazquez@coficab.com'],
            ['nombre' => 'Carlos GARCIA', 'email' => 'carlos.garcia@coficab.com'],
            ['nombre' => 'Cuahutemoc CAMARGO', 'email' => 'cuahutemoc.camargo@coficab.com'],
            ['nombre' => 'Jessica UGARTE', 'email' => 'jessica.ugarte@coficab.com'],
            ['nombre' => 'Victor HERNANDEZ', 'email' => 'victor.hernandez@coficab.com'],
            ['nombre' => 'Adan MOLINA', 'email' => 'adan.molina@coficab.com'],
            ['nombre' => 'Francisco CORDOVA', 'email' => 'francisco.cordova@coficab.com'],
            ['nombre' => 'Eduardo VALLES', 'email' => 'eduardo.valles@coficab.com'],
            ['nombre' => 'Maria VELAZQUEZ', 'email' => 'maria.velazquez@coficab.com'],
            ['nombre' => 'Cinthya MORALES', 'email' => 'cinthya.morales@coficab.com'],
            ['nombre' => 'Cesar GAXIOLA', 'email' => 'cesar.gaxiola@coficab.com'],
            ['nombre' => 'Cesar MARTINEZ', 'email' => 'cesar.martinez@coficab.com'],
            ['nombre' => 'Christian BELTRAN', 'email' => 'christian.beltran@coficab.com'],
            ['nombre' => 'Manuel RETA', 'email' => 'manuel.reta@coficab.com'],
            ['nombre' => 'Itzel ROMERO', 'email' => 'itzel.romero@coficab.com'],
            ['nombre' => 'Cesar FLORIANO', 'email' => 'cesar.floriano@coficab.com'],
            ['nombre' => 'Ana GOMEZ', 'email' => 'ana.gomez@coficab.com'],
            ['nombre' => 'Jorge CORRAL', 'email' => 'jorge.corral@coficab.com'],
            ['nombre' => 'Daniel GARCIA', 'email' => 'daniel.garcia@coficab.com'],
            ['nombre' => 'Ana DE LOS REYES', 'email' => 'ana.delosreyes@coficab.com'],
            ['nombre' => 'Arturo MEDINA', 'email' => 'arturo.medina@coficab.com'],
            ['nombre' => 'Marcela VALVERDE', 'email' => 'marcela.valverde@coficab.com'],
        ];

        foreach ($destinatarios as $dest) {
            DB::table('destinatarios_correos')->updateOrInsert(
                ['email' => $dest['email']],
                [
                    'nombre' => $dest['nombre'], 
                    'created_at' => now(),
                    'updated_at' => now()
                ]
            );
        }
    }
}