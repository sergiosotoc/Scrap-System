<?php
/* app/Exports/ReporteDiarioExport.php */
namespace App\Exports;

use App\Models\RegistrosScrap;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class ReporteDiarioExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle
{
    protected $registros;
    protected $fecha;
    protected $turno;
    protected $user;

    public function __construct($registros, $fecha, $turno, $user)
    {
        $this->registros = $registros;
        $this->fecha = $fecha;
        $this->turno = $turno;
        $this->user = $user;
    }

    public function collection()
    {
        return $this->registros;
    }

    public function title(): string
    {
        return 'Reporte Diario';
    }

    public function headings(): array
    {
        return [
            ['REPORTE DIARIO DE SCRAP'],
            ['Fecha: ' . $this->fecha],
            ['Turno: ' . ($this->turno ?: 'Todos')],
            ['Generado por: ' . $this->user->name],
            [], // Línea en blanco
            [
                'ID',
                'Hora Registro',
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
                'Lote',
                'Observaciones'
            ]
        ];
    }

    public function map($registro): array
    {
        return [
            $registro->id,
            $registro->fecha_registro ? $registro->fecha_registro->format('H:i') : 'N/A',
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
            $registro->peso_total,
            $registro->numero_lote ?? 'N/A',
            $registro->observaciones ?? 'N/A'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true, 'size' => 16]],
            2 => ['font' => ['bold' => true]],
            3 => ['font' => ['bold' => true]],
            4 => ['font' => ['bold' => true]],
            6 => ['font' => ['bold' => true]],
            'A:V' => ['alignment' => ['vertical' => 'center']],
        ];
    }
}