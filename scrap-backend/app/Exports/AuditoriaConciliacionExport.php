<?php
/* app/Exports/AuditoriaConciliacionExport.php */

namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Color;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use Carbon\Carbon;

class AuditoriaConciliacionExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithCustomStartCell, WithEvents, ShouldAutoSize
{
    protected $movimientos;
    protected $fechas;
    protected $destinosDisponibles;

    public function __construct($movimientos, $fechas, $totales)
    {
        $this->movimientos = $movimientos;
        $this->fechas = $fechas;
    }

    public function collection()
    {
        return collect($this->movimientos);
    }

    public function startCell(): string
    {
        return 'A12';
    }

    public function headings(): array
    {
        return [
            ['FOLIO / HU', 'FECHA', 'TURNO', 'MATERIAL', 'ORIGEN', 'RESPONSABLE', 'ROL (ORIGEN)', 'DESTINO FINAL', 'PESO (KG)']
        ];
    }

    public function map($movimiento): array
    {
        return [
            $movimiento['hu_id'] ?? 'PROD-INT',
            Carbon::parse($movimiento['fecha'])->format('d/m/Y'),
            'T' . $movimiento['turno'],
            strtoupper($movimiento['material']),
            strtoupper($movimiento['origen']),
            strtoupper($movimiento['responsable']),
            strtoupper($movimiento['rol']), 
            strtoupper($movimiento['destino_display'] ?? $movimiento['destino']),
            (float) $movimiento['peso'],
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            12 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF']],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function (AfterSheet $event) {
                $sheet = $event->sheet;
                $rowCount = count($this->movimientos);
                $lastRow = 12 + $rowCount;

                $rolRange = "G13:G{$lastRow}";
                $destinoRange = "H13:H{$lastRow}";
                $pesoRange = "I13:I{$lastRow}";

                try {
                    $logoPath = public_path('Logo-COFICAB.png');
                    if (file_exists($logoPath)) {
                        $drawing = new Drawing();
                        $drawing->setPath($logoPath)->setHeight(60)->setCoordinates('A1')->setWorksheet($sheet->getDelegate());
                    }
                } catch (\Exception $e) {
                }

                $sheet->setCellValue('D2', 'AUDITORÍA DE CONCILIACIÓN PLANTA VS ALMACÉN');
                $sheet->mergeCells('D2:I2');
                $sheet->getStyle('D2')->getFont()->setBold(true)->setSize(16)->getColor()->setRGB('1E3A8A');

                $sheet->setCellValue('B5', 'RESUMEN POR ROL');
                $sheet->getStyle('B5')->getFont()->setBold(true)->setUnderline(true);

                $sheet->setCellValue('B6', 'ENTREGA OPERADORES (PLANTA):');
                $sheet->setCellValue('C6', "=SUMIF($rolRange,\"*OPERADOR*\",$pesoRange)");

                $sheet->setCellValue('B7', 'RECEPCIÓN RECEPTORES (ALMACÉN):');
                $sheet->setCellValue('C7', "=SUMIF($rolRange,\"*RECEPTOR*\",$pesoRange)");

                $sheet->setCellValue('B8', 'DIFERENCIA DE PROCESO:');
                $sheet->setCellValue('C8', "=C6-C7");

                $sheet->getStyle('B6:B8')->getFont()->setBold(true);
                $sheet->getStyle('C6:C8')->getNumberFormat()->setFormatCode('#,##0.00" kg"');
                $sheet->getStyle('C8')->getFont()->setBold(true)->getColor()->setRGB('DC2626'); // Rojo para merma

                $sheet->setCellValue('F5', 'ACUMULADO POR DESTINO FINAL');
                $sheet->getStyle('F5')->getFont()->setBold(true)->setUnderline(true);

                $sheet->setCellValue('F6', 'ALMACENAMIENTO:');
                $sheet->setCellValue('F7', 'RECICLAJE:');
                $sheet->setCellValue('F8', 'VENDIDO:');

                $sheet->setCellValue('G6', "=SUMIF($destinoRange,\"*ALMACENAMIENTO*\",$pesoRange)");
                $sheet->setCellValue('G7', "=SUMIF($destinoRange,\"*RECICLAJE*\",$pesoRange)");
                $sheet->setCellValue('G8', "=SUMIF($destinoRange,\"*VENDIDO*\",$pesoRange)");

                $sheet->getStyle('F6:F8')->getFont()->setBold(true);
                $sheet->getStyle('G6:G8')->getNumberFormat()->setFormatCode('#,##0.00" kg"');

                if ($rowCount > 0) {
                    $sheet->getStyle("A12:I{$lastRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]]
                    ]);

                    for ($i = 13; $i <= $lastRow; $i++) {
                        $rol = strtoupper($sheet->getCell("G$i")->getValue());

                        if (str_contains($rol, 'RECEPTOR')) {
                            $sheet->getStyle("A{$i}:I{$i}")->getFill()
                                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E8F5E9');
                        } else {
                            $sheet->getStyle("A{$i}:I{$i}")->getFill()
                                ->setFillType(Fill::FILL_SOLID)->getStartColor()->setRGB('E3F2FD');
                        }
                    }
                }

                $sheet->setShowGridlines(false);
                $sheet->getDelegate()->freezePane('A13');
            },
        ];
    }
}
