<?php
/* app/Exports/FormatoScrapEmpresaExport.php */

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use PhpOffice\PhpSpreadsheet\Cell\Coordinate;
use Carbon\Carbon;

class FormatoScrapEmpresaExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithEvents, WithCustomStartCell
{
    protected $registros;
    protected $fecha;
    protected $turno;
    protected $user;
    protected $materiales;

    public function __construct($registros, $fecha, $turno, $user, $materiales)
    {
        $this->registros = $registros;
        $this->fecha = $fecha;
        $this->turno = $turno;
        $this->user = $user;
        $this->materiales = $materiales;
    }

    public function collection()
    {
        return $this->registros;
    }

    public function startCell(): string
    {
        return 'A7';
    }

    public function headings(): array
    {
        $headers = ['ÁREA', 'MÁQUINA'];

        // Agregamos dinámicamente los nombres de los materiales
        foreach ($this->materiales as $mat) {
            $headers[] = strtoupper($mat->tipo_nombre);
        }

        $headers[] = 'TOTAL GENERAL';
        return $headers;
    }

    public function map($registro): array
    {
        $row = [
            $registro->area_real,
            $registro->maquina_real,
        ];

        foreach ($this->materiales as $mat) {
            $row[] = (float) $registro->getPesoPorTipo($mat->tipo_nombre);
        }

        $row[] = 0;

        return $row;
    }

    public function styles(Worksheet $sheet)
    {
        $totalCols = count($this->materiales) + 3;
        $lastColLetter = Coordinate::stringFromColumnIndex($totalCols);

        $sheet->getColumnDimension('A')->setWidth(18);
        $sheet->getColumnDimension('B')->setWidth(25);

        for ($i = 3; $i <= $totalCols; $i++) {
            $sheet->getColumnDimension(Coordinate::stringFromColumnIndex($i))->setWidth(12);
        }

        return [
            7 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 9],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '1F4E79']
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => '000000']
                    ]
                ]
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet;
                $sheet->setShowGridlines(false);

                $numMateriales = count($this->materiales);
                $totalCols = $numMateriales + 3;
                $lastColLetter = Coordinate::stringFromColumnIndex($totalCols);
                $firstDataColLetter = 'C';
                $lastDataColLetter = Coordinate::stringFromColumnIndex($totalCols - 1);

                $rowCount = $this->registros->count();
                $firstDataRow = 8;
                $lastDataRow = $firstDataRow + $rowCount - 1;

                try {
                    $logoPath = public_path('Logo-COFICAB.png');
                    if (file_exists($logoPath)) {
                        $drawing = new Drawing();
                        $drawing->setName('Logo');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(80);
                        $drawing->setCoordinates('A1');
                        $drawing->setOffsetX(10);
                        $drawing->setOffsetY(5);
                        $drawing->setWorksheet($sheet->getDelegate());
                    }
                } catch (\Exception $e) {
                }

                $sheet->setCellValue('D2', 'PESAJE SCRAP COF MX');
                $sheet->mergeCells("D2:{$lastDataColLetter}2");
                $sheet->getStyle('D2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 20],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
                ]);

                $sheet->setCellValue('C4', 'FECHA:');
                $sheet->setCellValue('D4', Carbon::parse($this->fecha)->format('d-M-Y'));
                $sheet->getStyle('C4')->getFont()->setBold(true);

                $turnoMap = [1 => 'PRIMER TURNO', 2 => 'SEGUNDO TURNO', 3 => 'TERCER TURNO'];
                $turnoTexto = $this->turno ? ($turnoMap[$this->turno] ?? 'TODOS') : 'TODOS';
                $sheet->setCellValue('G4', 'TURNO:');
                $sheet->setCellValue('H4', $turnoTexto);
                $sheet->getStyle('G4')->getFont()->setBold(true);

                $sheet->setCellValue('K4', 'OPERADOR:');
                $sheet->setCellValue('L4', strtoupper($this->user->name));
                $sheet->getStyle('K4')->getFont()->setBold(true);

                if ($rowCount > 0) {
                    $sheet->getStyle("A7:{$lastColLetter}{$lastDataRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                        'font' => ['size' => 10],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                    ]);

                    $sheet->getStyle("C{$firstDataRow}:{$lastColLetter}{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    for ($row = $firstDataRow; $row <= $lastDataRow; $row++) {
                        $sheet->setCellValue("{$lastColLetter}{$row}", "=SUM({$firstDataColLetter}{$row}:{$lastDataColLetter}{$row})");
                    }
                }

                $totalRow = $lastDataRow + 1;
                $sheet->setCellValue("A{$totalRow}", 'TOTAL GENERAL');
                $sheet->mergeCells("A{$totalRow}:B{$totalRow}");

                for ($colIndex = 3; $colIndex <= $totalCols; $colIndex++) {
                    $colLetter = Coordinate::stringFromColumnIndex($colIndex);
                    $sheet->setCellValue("{$colLetter}{$totalRow}", "=SUM({$colLetter}{$firstDataRow}:{$colLetter}{$lastDataRow})");
                }

                $sheet->getStyle("A{$totalRow}:{$lastColLetter}{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
                ]);

                $sheet->getStyle("C{$firstDataRow}:{$lastColLetter}{$totalRow}")
                    ->getNumberFormat()->setFormatCode('#,##0.00');
            },
        ];
    }
}
