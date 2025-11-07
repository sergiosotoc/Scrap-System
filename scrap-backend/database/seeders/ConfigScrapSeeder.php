<?php
// database/seeders/ConfigScrapSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ConfigScrapSeeder extends Seeder
{
    public function run(): void
    {
        // Áreas y Máquinas basadas exactamente en el PDF
        $areasMaquinas = [
            'TREFILADO' => ['TREF 1', 'TREF 2', 'TREF 3', 'TREF 4', 'TREF 5', 'TREF 6'],
            'BUNCHER' => ['ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4', 'ZONA 5', 'ZONA 6', 'ZONA 7', 'ZONA 8', 'ZONA 9', 'ZONA 10', 'ZONA 11', 'ZONA 12', 'ZONA 13', 'ZONA 14', 'ZONA 15', '800'],
            'CABALLE' => ['CABALLE'],
            'EXTRUSION' => ['EXT01', 'EXT02', 'EXT03', 'EXT04', 'EXT05', 'EXT06', 'EXT07', 'EXT08', 'EXT09'],
            'BATERIA' => ['Bateria PVC', 'Bateria XLPE'],
            'XLPE' => ['EXT11', 'EXT12', 'EXT13', 'EXT14', 'EXT15', 'EXT16'],
            'EBEAM' => ['Tequila', 'Mezcal', 'Pulque', 'Sotol', 'Tepache', 'WASIK3'],
            'RWD' => ['REW PVC', 'REW PE', 'REW Battery'],
            'OTHERS' => ['Ingenieria', 'RYD', 'Mtto.', 'Nuevos Negocios', 'Calidad', 'Retrabajo Metal', 'Retrabajo Extrusion', 'Retrabajo Extrusion XLPE', 'Logistica', 'Obsoleto', 'RMA', 'Proveedores', 'Otras plantas Coficab', 'Recycling Compound', 'Recycling Compound Battery', 'Cable Area Metal', 'Comission Eng'],
            'FPS' => ['FPS Metal', 'FPS STD PVC', 'FPS XLPE', 'FPS Bateria'],
        ];

        $orden = 1;
        foreach ($areasMaquinas as $area => $maquinas) {
            foreach ($maquinas as $maquina) {
                DB::table('config_areas_maquinas')->insert([
                    'area_nombre' => $area,
                    'maquina_nombre' => $maquina,
                    'orden' => $orden++,
                    'activa' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        // Tipos de Scrap basados exactamente en el PDF
        $tiposScrap = [
            'COBRE' => [
                ['tipo_nombre' => 'cobre estañado', 'columna_db' => 'peso_cobre_estanado'],
                ['tipo_nombre' => 'PURGA PVC', 'columna_db' => 'peso_purga_pvc'],
                ['tipo_nombre' => 'PURGA PE', 'columna_db' => 'peso_purga_pe'],
                ['tipo_nombre' => 'PURGA PUR', 'columna_db' => 'peso_purga_pur'],
                ['tipo_nombre' => 'PURGA PP', 'columna_db' => 'peso_purga_pp'],
                ['tipo_nombre' => 'CABLE PVC', 'columna_db' => 'peso_cable_pvc'],
                ['tipo_nombre' => 'CABLE PE', 'columna_db' => 'peso_cable_pe'],
                ['tipo_nombre' => 'CABLE PUR', 'columna_db' => 'peso_cable_pur'],
                ['tipo_nombre' => 'CABLE PP', 'columna_db' => 'peso_cable_pp'],
            ],
            'ALUMINIO' => [
                ['tipo_nombre' => 'CABLE ALUMINIO', 'columna_db' => 'peso_cable_aluminio'],
            ],
            'CABLE ESTAÑADO' => [
                ['tipo_nombre' => 'CABLE ESTAÑADO PVC', 'columna_db' => 'peso_cable_estanado_pvc'],
                ['tipo_nombre' => 'CABLE ESTAÑADO PE', 'columna_db' => 'peso_cable_estanado_pe'],
            ]
        ];

        $ordenTipo = 1;
        foreach ($tiposScrap as $categoria => $tipos) {
            foreach ($tipos as $tipo) {
                DB::table('config_tipos_scrap')->insert([
                    'categoria' => $categoria,
                    'tipo_nombre' => $tipo['tipo_nombre'],
                    'columna_db' => $tipo['columna_db'],
                    'orden' => $ordenTipo++,
                    'activo' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}