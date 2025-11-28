<?php
/* app/Exports/FormatoScrapEmpresaExport.php */
namespace App\Exports;

use App\Models\RegistrosScrap;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;

class FormatoScrapEmpresaExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle
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
        return 'PESAJE SCRAP';
    }

    public function headings(): array
    {
        return [
            ['PESAJE SCRAP COF MX'],
            ['FECHA', $this->fecha],
            ['TURNO', $this->turno ?: 'Todos'],
            ['OPERADOR DE LOGISTICA', $this->user->name],
            [],
            [
                'AREA',
                'MAQUINA',
                'COBRE',
                'COBRE ESTAÑADO',
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
                'CABLE ESTAÑADO PE',
                'TOTAL',
                'ROD',
                'ROD',
                '-'
            ]
        ];
    }

    public function map($registro): array
    {
        return [
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
            '', // ROD
            '', // ROD  
            ''  // -
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getColumnDimension('A')->setWidth(15);
        $sheet->getColumnDimension('B')->setWidth(15);
        $sheet->getColumnDimension('C')->setWidth(10);
        $sheet->getColumnDimension('D')->setWidth(12);
        $sheet->getColumnDimension('E')->setWidth(10);
        $sheet->getColumnDimension('F')->setWidth(10);
        $sheet->getColumnDimension('G')->setWidth(10);
        $sheet->getColumnDimension('H')->setWidth(10);
        $sheet->getColumnDimension('I')->setWidth(10);
        $sheet->getColumnDimension('J')->setWidth(10);
        $sheet->getColumnDimension('K')->setWidth(10);
        $sheet->getColumnDimension('L')->setWidth(10);
        $sheet->getColumnDimension('M')->setWidth(12);
        $sheet->getColumnDimension('N')->setWidth(15);
        $sheet->getColumnDimension('O')->setWidth(15);
        $sheet->getColumnDimension('P')->setWidth(12);
        $sheet->getColumnDimension('Q')->setWidth(8);
        $sheet->getColumnDimension('R')->setWidth(8);
        $sheet->getColumnDimension('S')->setWidth(5);

        return [
            1 => [
                'font' => ['bold' => true, 'size' => 16],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
            ],
            2 => [
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E6E6FA']]
            ],
            3 => [
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E6E6FA']]
            ],
            4 => [
                'font' => ['bold' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'E6E6FA']]
            ],
            6 => [
                'font' => ['bold' => true, 'size' => 11],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'D3D3D3']],
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]]
            ],
            'A7:S1000' => [
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
            ],
            'C7:P1000' => [
                'numberFormat' => ['formatCode' => '0.00']
            ]
        ];
    }
}