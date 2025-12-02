<?php
/* app/Exports/FormatoScrapEmpresaExport.php */
namespace App\Exports;

use App\Models\RegistrosScrap;
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
use Carbon\Carbon;

class FormatoScrapEmpresaExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithEvents, WithCustomStartCell
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

    // ✅ Empezar en A7. Las filas 1-6 quedan libres para el encabezado manual.
    // No usamos insertNewRowBefore para evitar que se mueva todo.
    public function startCell(): string
    {
        return 'A7';
    }

    public function headings(): array
    {
        return [
            'ÁREA',
            'MÁQUINA',
            'COBRE',
            'COBRE EST.',
            'PURGA PVC',
            'PURGA PE', 
            'PURGA PUR',
            'PURGA PP',
            'CABLE PVC',
            'CABLE PE',
            'CABLE PUR',
            'CABLE PP',
            'CABLE ALU',
            'CABLE EST. PVC',
            'CABLE EST. PE',
            'TOTAL GENERAL',
        ];
    }

    public function map($registro): array
    {
        return [
            $registro->area_real,
            $registro->maquina_real,
            (float) ($registro->peso_cobre ?? 0),
            (float) ($registro->peso_cobre_estanado ?? 0),
            (float) ($registro->peso_purga_pvc ?? 0),
            (float) ($registro->peso_purga_pe ?? 0),
            (float) ($registro->peso_purga_pur ?? 0),
            (float) ($registro->peso_purga_pp ?? 0),
            (float) ($registro->peso_cable_pvc ?? 0),
            (float) ($registro->peso_cable_pe ?? 0),
            (float) ($registro->peso_cable_pur ?? 0),
            (float) ($registro->peso_cable_pp ?? 0),
            (float) ($registro->peso_cable_aluminio ?? 0),
            (float) ($registro->peso_cable_estanado_pvc ?? 0),
            (float) ($registro->peso_cable_estanado_pe ?? 0),
            0, 
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getColumnDimension('A')->setWidth(18);
        $sheet->getColumnDimension('B')->setWidth(25);
        foreach(range('C','P') as $col) {
            $sheet->getColumnDimension($col)->setWidth(12);
        }

        return [
            // Fila 7: Encabezados de la tabla (Azul Oscuro)
            7 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 9],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER, 'wrapText' => true],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']], 
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]]
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet;
                $sheet->setShowGridlines(false); 

                // --- 1. LOGO GRANDE ---
                try {
                    $logoPath = 'C:/xampp/htdocs/Control-Scrap/scrap-backend/public/Logo-COFICAB.png';
                    if (!file_exists($logoPath)) {
                        $logoPath = public_path('Logo-COFICAB.png');
                    }

                    if (file_exists($logoPath)) {
                        $drawing = new Drawing();
                        $drawing->setName('Logo');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(80); // ✅ Grande
                        $drawing->setCoordinates('A1'); // Desde la esquina
                        $drawing->setOffsetX(10);
                        $drawing->setOffsetY(5);
                        $drawing->setWorksheet($sheet->getDelegate());
                    }
                } catch (\Exception $e) {}

                // --- 2. TÍTULO PRINCIPAL (Fila 2) ---
                $sheet->setCellValue('D2', 'PESAJE SCRAP COF MX');
                $sheet->mergeCells('D2:K2');
                $sheet->getStyle('D2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 20, 'color' => ['rgb' => '000000']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
                ]);

                // --- 3. INFORMACIÓN DE CABECERA (Fila 4) ---
                // Fecha
                $sheet->setCellValue('C4', 'FECHA:');
                $sheet->setCellValue('D4', Carbon::parse($this->fecha)->format('d-M-Y')); 
                $sheet->getStyle('C4')->getFont()->setBold(true);
                $sheet->getStyle('D4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('D4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                // Turno
                $turnoMap = [1 => 'PRIMER TURNO', 2 => 'SEGUNDO TURNO', 3 => 'TERCER TURNO'];
                $turnoTexto = $this->turno ? ($turnoMap[$this->turno] ?? 'TODOS') : 'TODOS';
                
                $sheet->setCellValue('G4', 'TURNO:');
                $sheet->setCellValue('H4', $turnoTexto);
                $sheet->mergeCells('H4:I4');
                $sheet->getStyle('G4')->getFont()->setBold(true);
                $sheet->getStyle('H4:I4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('H4:I4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                // Operador
                $sheet->setCellValue('K4', 'OPERADOR:');
                $sheet->setCellValue('L4', strtoupper($this->user->name));
                $sheet->mergeCells('L4:N4');
                $sheet->getStyle('K4')->getFont()->setBold(true);
                $sheet->getStyle('L4:N4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle('L4:N4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                // --- 4. DATOS Y FÓRMULAS ---
                $rowCount = $this->registros->count();
                $firstDataRow = 8; // Datos empiezan en 8 (Encabezados en 7)
                $lastDataRow = $firstDataRow + $rowCount - 1;

                if ($rowCount > 0) {
                    $sheet->getStyle("A7:P{$lastDataRow}")->applyFromArray([
                        'borders' => [
                            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]
                        ],
                        'font' => ['size' => 10],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                    ]);
                    
                    // Centrar valores numéricos
                    $sheet->getStyle("C{$firstDataRow}:P{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    // Fórmulas por fila
                    for ($row = $firstDataRow; $row <= $lastDataRow; $row++) {
                        $sheet->setCellValue("P{$row}", "=SUM(C{$row}:O{$row})");
                    }
                }

                // --- 5. TOTALES ---
                $totalRow = $lastDataRow + 1;
                $sheet->setCellValue("A{$totalRow}", 'TOTAL GENERAL');
                $sheet->mergeCells("A{$totalRow}:B{$totalRow}");

                foreach (range('C', 'P') as $col) {
                    $sheet->setCellValue("{$col}{$totalRow}", "=SUM({$col}{$firstDataRow}:{$col}{$lastDataRow})");
                }

                $sheet->getStyle("A{$totalRow}:P{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
                ]);
                
                $sheet->getStyle("C{$firstDataRow}:P{$totalRow}")->getNumberFormat()->setFormatCode('#,##0.00');
            },
        ];
    }
}