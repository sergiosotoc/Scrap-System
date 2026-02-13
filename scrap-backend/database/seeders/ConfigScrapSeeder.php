<?php
// database/seeders/ConfigScrapSeeder.php
namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ConfigScrapSeeder extends Seeder
{
    public function run(): void
    {
        // Limpiamos las tablas antes de insertar para evitar duplicados
        DB::statement('SET FOREIGN_KEY_CHECKS=0;');
        DB::table('config_areas_maquinas')->truncate();
        DB::table('config_tipos_scrap')->truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1;');

        // ==========================================
        // 1. MATERIALES DEL OPERADOR
        // ==========================================
        $materialesOperador = [
            'COBRE',
            'Cobre Estañado',
            'PURGA PVC',
            'PURGA PE',
            'PURGA PUR',
            'PURGA PP',
            'CABLE PVC',
            'CABLE PE',
            'CABLE PUR',
            'CABLE PP',
            'CABLE ALUMINIO',
            'CABLE ESTAÑADO PVC',
            'CABLE ESTAÑADO PE'
        ];

        $orden = 1;
        foreach ($materialesOperador as $nombre) {
            DB::table('config_tipos_scrap')->insert([
                'tipo_nombre' => $nombre,
                'uso' => 'operador',
                'orden' => $orden++,
                'columna_db' => Str::slug($nombre, '_'), 
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ==========================================
        // 2. MATERIALES DEL RECEPTOR
        // ==========================================
        $materialesReceptor = [
            'Lata de aluminio',
            'Desechos metálicos',
            'Desechos componentes eléctricos',
            'Cable aluminio',
            'Cobre estañado',
            'Cable estañado',
            'Purga PE',
            'PURGA PE MOLIDO',
            'Cable PE',
            'Cable PE 3.5',
            'Cable de batería',
            'Purga PVC',
            'Cobre',
            'Botellas pet',
            'Plástico',
            'Cartón',
            'Fleje',
            'Leña',
            'Cobre molido'
        ];

        foreach ($materialesReceptor as $nombre) {
            DB::table('config_tipos_scrap')->insert([
                'tipo_nombre' => $nombre,
                'uso' => 'receptor',
                'orden' => $orden++,
                'columna_db' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // ==========================================
        // 3. ÁREAS Y MÁQUINAS (CORREGIDO según tu lista)
        // ==========================================
        $areasMaquinas = [
            'ROD' => [
                'ROD'
            ],
            'TREFILADO' => [
                'TREF 1', 'TREF 2', 'TREF 3', 'TREF 4', 'TREF 5', 'TREF 6'
            ],
            'BUNCHER' => [
                'ZONA 1', 'ZONA 2', 'ZONA 3', 'ZONA 4', 'ZONA 5', 
                'ZONA 6', 'ZONA 7', 'ZONA 8', 'ZONA 9', 'ZONA 10', 
                'ZONA 11', 'ZONA 12', 'ZONA 13', 'ZONA 14', 'ZONA 15', '800'
            ],
            'CABALLE' => [
                'CABALLE'
            ],
            'EXTRUSION' => [
                'EXT01', 'EXT02', 'EXT03', 'EXT04', 'EXT05', 
                'EXT06', 'EXT07', 'EXT08', 'EXT09'
            ],
            'BATERIA' => [
                'Bateria PVC',
                'Bateria XLPE'
            ],
            'XLPE' => [
                'EXT11', 'EXT12', 'EXT13', 'EXT14', 'EXT15', 'EXT16'
            ],
            'EBEAM' => [
                'Tequila',
                'MEZCAL',
                'Pulque',
                'Sotol',
                'Tepache',
                'WASIK3' 
            ],
            'RWD' => [
                'REW PVC',
                'REW PE',
                'REW Battery'
            ],
            'OTHERS' => [
                'Ingenieria',
                'RYD',
                'Mtto.',
                'Nuevos Negocios',
                'Calidad',
                'Retrabajo Metal',
                'Retrabajo Extrusion',
                'Retrabajo Extrusion XLPE',
                'REBOBINADORA DE METAL',
                'Logistica',
                'Obsoleto',
                'RMA',
                'Proveedores',
                'Otras plantas Coficab',
                'Recycling Compound',
                'Recycling Compound Battery',
                'Cable Area Metal',
                'Comission Eng'
            ],
            'FPS' => [
                'FPS Metal',
                'FPS STD PVC',
                'FPS XLPE',
                'FPS Bateria'
            ]
        ];

        // Contador global para orden
        $ordenGlobal = 1;
        
        foreach ($areasMaquinas as $area => $maquinas) {
            foreach ($maquinas as $maquina) {
                DB::table('config_areas_maquinas')->insert([
                    'area_nombre' => $area,
                    'maquina_nombre' => $maquina,
                    'orden' => $ordenGlobal++,
                    'activa' => true,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }
}