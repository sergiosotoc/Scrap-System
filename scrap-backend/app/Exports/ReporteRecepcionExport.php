<?php
/* app/Exports/ReporteRecepcionExport.php */
namespace App\Exports;

use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithCustomStartCell;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;
use Carbon\Carbon;
use App\Models\RecepcionScrap;

class ReporteRecepcionExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithCustomStartCell, WithEvents
{
    protected $recepciones;
    protected $filtros;
    protected $user;

    public function __construct($recepciones, $filtros, $user)
    {
        $this->recepciones = $recepciones;
        $this->filtros = $filtros;
        $this->user = $user;
    }

    public function collection()
    {
        return $this->recepciones->groupBy('tipo_material')->map(function ($grupo) {
            $first = $grupo->first();
            $pesoTotal = $grupo->sum('peso_kg');
            
            $consolidado = clone $first;
            $consolidado->peso_kg = $pesoTotal; 
            
            $origenes = $grupo->pluck('origen_especifico')->unique();
            if ($origenes->count() > 1) {
                $consolidado->origen_especifico = 'VARIOS ORÍGENES';
                $consolidado->origen_tipo = 'MIXTO';
            }

            $destinos = $grupo->pluck('destino')->unique();
            if ($destinos->count() > 1) {
                $consolidado->destino = 'VARIOS DESTINOS';
            }

            return $consolidado;
        })->values(); 
    }

    public function startCell(): string
    {
        return 'A8';
    }

    public function headings(): array
    {
        return [
            'MATERIAL',
            'TIPO ORIGEN',
            'DETALLE ORIGEN',
            'DESTINO',
            'RECIBIÓ',
            'PESO TOTAL (KG)' 
        ];
    }

    public function map($recepcion): array
    {
        return [
            strtoupper($recepcion->tipo_material),
            strtoupper($recepcion->origen_tipo),
            strtoupper($recepcion->origen_especifico ?? 'INTERNA'),
            strtoupper($recepcion->destino),
            $recepcion->receptor ? strtoupper($recepcion->receptor->name) : 'N/A',
            (float) $recepcion->peso_kg, 
        ];
    }

    public function styles(Worksheet $sheet)
    {
        $sheet->getColumnDimension('A')->setWidth(35); 
        $sheet->getColumnDimension('B')->setWidth(20);
        $sheet->getColumnDimension('C')->setWidth(35);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(30);
        $sheet->getColumnDimension('F')->setWidth(20);

        return [
            8 => [ 
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '2563EB']], // Azul Vibrante
                'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => 'FFFFFF']]]
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                $sheet = $event->sheet;
                $sheet->setShowGridlines(false);

                // --- 1. LOGO (Izquierda) ---
                try {
                    $logoPath = public_path('Logo-COFICAB.png');
                    if (file_exists($logoPath)) {
                        $drawing = new Drawing();
                        $drawing->setName('Logo');
                        $drawing->setPath($logoPath);
                        $drawing->setHeight(60);
                        $drawing->setCoordinates('A1');
                        $drawing->setOffsetX(10);
                        $drawing->setOffsetY(5);
                        $drawing->setWorksheet($sheet->getDelegate());
                    }
                } catch (\Exception $e) {}

                // --- 2. TÍTULO (Centrado) ---
                $sheet->setCellValue('A2', 'REPORTE DE SCRAP');
                $sheet->mergeCells('A2:F2'); 
                $sheet->getStyle('A2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 24, 'color' => ['rgb' => '1E3A8A']], 
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
                ]);

                // --- 3. INFORMACIÓN ---
                $sheet->setCellValue('A4', 'FECHA REPORTE:');
                $fechaTexto = Carbon::parse($this->filtros['fecha_inicio'])->format('d-M-Y');
                if ($this->filtros['fecha_inicio'] !== $this->filtros['fecha_fin']) {
                    $fechaTexto .= ' AL ' . Carbon::parse($this->filtros['fecha_fin'])->format('d-M-Y');
                }
                $sheet->setCellValue('B4', $fechaTexto);

                $sheet->setCellValue('A5', 'GENERADO POR:');
                $sheet->setCellValue('B5', strtoupper($this->user->name));

                $destinoTexto = !empty($this->filtros['destino']) ? strtoupper($this->filtros['destino']) : 'TODOS';
                $sheet->setCellValue('A6', 'DESTINO FILTRADO:');
                $sheet->setCellValue('B6', $destinoTexto);

                $sheet->getStyle('A4:A6')->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => '374151']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]
                ]);

                $sheet->getStyle('B4:B6')->applyFromArray([
                    'font' => ['bold' => false, 'color' => ['rgb' => '000000']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_LEFT]
                ]);

                // --- 4. CUERPO DE LA TABLA ---
                $rowCount = $this->collection()->count(); 
                $headerRow = 8; 
                $lastDataRow = $headerRow + $rowCount;
                $lastCol = 'F';

                if ($rowCount > 0) {
                    $dataRange = "A" . ($headerRow + 1) . ":{$lastCol}{$lastDataRow}";
                    $sheet->getStyle($dataRange)->getAlignment()->setWrapText(true);
                    $sheet->getStyle($dataRange)->getAlignment()->setVertical(Alignment::VERTICAL_CENTER);
                    
                    $sheet->getStyle("B" . ($headerRow + 1) . ":B{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    $sheet->getStyle("D" . ($headerRow + 1) . ":E{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    $sheet->getStyle("F" . ($headerRow + 1) . ":F{$lastDataRow}")->applyFromArray([
                        'font' => ['bold' => true, 'color' => ['rgb' => '1F2937']],
                        'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                        'numberFormat' => ['formatCode' => '#,##0.00 "kg"']
                    ]);

                    for ($row = $headerRow + 1; $row <= $lastDataRow; $row++) {
                        $sheet->getRowDimension($row)->setRowHeight(25);
                        if ($row % 2 != 0) { 
                            $sheet->getStyle("A{$row}:F{$row}")->getFill()
                                ->setFillType(Fill::FILL_SOLID)
                                ->getStartColor()->setARGB('EFF6FF'); // Azul muy pálido (Zebra)
                        }
                    }

                    $sheet->getStyle("A{$headerRow}:{$lastCol}{$lastDataRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => 'CBD5E1']]]
                    ]);
                    $sheet->getStyle("A8:{$lastCol}{$lastDataRow}")->applyFromArray([
                        'borders' => ['outline' => ['borderStyle' => Border::BORDER_MEDIUM, 'color' => ['rgb' => '2563EB']]]
                    ]);
                }

                // --- 5. TOTALES ---
                $totalRow = $lastDataRow + 1;
                $sheet->getRowDimension($totalRow)->setRowHeight(35); 
                
                $sheet->setCellValue("E{$totalRow}", 'TOTAL GENERAL');
                $sheet->setCellValue("F{$totalRow}", "=SUM(F" . ($headerRow + 1) . ":F{$lastDataRow})");

                $sheet->getStyle("A{$totalRow}:{$lastCol}{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true, 'size' => 12],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => 'DBEAFE']], // Azul claro para totales
                    'borders' => ['top' => ['borderStyle' => Border::BORDER_DOUBLE, 'color' => ['rgb' => '2563EB']]],
                    'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                ]);

                $sheet->getStyle("E{$totalRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_RIGHT);
                $sheet->getStyle("F{$totalRow}")->applyFromArray([
                    'numberFormat' => ['formatCode' => '#,##0.00 "kg"'],
                    'font' => ['color' => ['rgb' => '1E40AF'], 'bold' => true, 'size' => 12],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER]
                ]);
            },
        ];
    }
}