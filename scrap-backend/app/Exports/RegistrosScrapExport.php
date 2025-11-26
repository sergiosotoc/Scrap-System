<?php
/* app/Exports/RegistrosScrapExport.php */
namespace App\Exports;

use App\Models\RegistrosScrap;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class RegistrosScrapExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $registros;

    public function __construct($registros)
    {
        $this->registros = $registros;
    }

    public function collection()
    {
        return $this->registros;
    }

    public function headings(): array
    {
        return [
            'ID',
            'Fecha Registro',
            'Turno',
            'Operador',
            'Área',
            'Máquina',
            'Cobre (kg)',
            'Cobre Estañado (kg)',
            'Purga PVC (kg)',
            'Purga PE (kg)',
            'Purga PUR (kg)',
            'Purga PP (kg)',
            'Cable PVC (kg)',
            'Cable PE (kg)',
            'Cable PUR (kg)',
            'Cable PP (kg)',
            'Cable Aluminio (kg)',
            'Cable Est. PVC (kg)',
            'Cable Est. PE (kg)',
            'Peso Total (kg)',
            'Número Lote',
            'Observaciones'
        ];
    }

    public function map($registro): array
    {
        return [
            $registro->id,
            $registro->fecha_registro ? $registro->fecha_registro->format('d/m/Y H:i') : 'N/A',
            $registro->turno,
            $registro->operador ? $registro->operador->name : 'N/A',
            $registro->area_real,
            $registro->maquina_real,
            $registro->peso_cobre ?? 0,
            $registro->peso_cobre_estanado ?? 0,
            $registro->peso_purga_pvc ?? 0,
            $registro->peso_purga_pe ?? 0,
            $registro->peso_purga_pur ?? 0,
            $registro->peso_purga_pp ?? 0,
            $registro->peso_cable_pvc ?? 0,
            $registro->peso_cable_pe ?? 0,
            $registro->peso_cable_pur ?? 0,
            $registro->peso_cable_pp ?? 0,
            $registro->peso_cable_aluminio ?? 0,
            $registro->peso_cable_estanado_pvc ?? 0,
            $registro->peso_cable_estanado_pe ?? 0,
            $registro->peso_total ?? 0,
            $registro->numero_lote ?? 'N/A',
            $registro->observaciones ?? 'N/A'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
            'A:V' => ['alignment' => ['vertical' => 'center']],
        ];
    }
}