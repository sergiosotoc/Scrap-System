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
        return 'A7'; // Mismo inicio que FormatoScrapEmpresaExport
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
        // Anchos de columna ajustados pero manteniendo proporción
        $sheet->getColumnDimension('A')->setWidth(30); 
        $sheet->getColumnDimension('B')->setWidth(15);
        $sheet->getColumnDimension('C')->setWidth(30);
        $sheet->getColumnDimension('D')->setWidth(20);
        $sheet->getColumnDimension('E')->setWidth(25);
        $sheet->getColumnDimension('F')->setWidth(20);

        // Estilo de encabezado idéntico al otro reporte
        return [
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

                // --- LOGO (Idéntico) ---
                try {
                    $logoPath = public_path('Logo-COFICAB.png');
                    if (!file_exists($logoPath)) {
                        // Fallback opcional si no está en public
                        $logoPath = public_path('images/Logo-COFICAB.png'); 
                    }

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
                } catch (\Exception $e) {}

                // --- TÍTULO PRINCIPAL (Ajustado a columnas A-F) ---
                $sheet->setCellValue('B2', 'REPORTE DE RECEPCIONES SCRAP'); // Usamos B2 para centrar similar al otro
                $sheet->mergeCells('B2:E2'); // Ajustado al ancho de este reporte (6 columnas vs 16)
                $sheet->getStyle('B2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 20, 'color' => ['rgb' => '000000']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
                ]);

                // --- INFORMACIÓN DE CABECERA (Misma estructura) ---
                
                // Fecha
                $sheet->setCellValue('B4', 'FECHA REPORTE:');
                $fechaTexto = Carbon::parse($this->filtros['fecha_inicio'])->format('d-M-Y');
                if ($this->filtros['fecha_inicio'] !== $this->filtros['fecha_fin']) {
                    $fechaTexto .= ' AL ' . Carbon::parse($this->filtros['fecha_fin'])->format('d-M-Y');
                }
                $sheet->setCellValue('C4', $fechaTexto); 
                $sheet->getStyle('B4')->getFont()->setBold(true);
                $sheet->getStyle('C4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('C4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                // Usuario / Generado Por
                $sheet->setCellValue('D4', 'GENERADO POR:');
                $sheet->setCellValue('E4', strtoupper($this->user->name));
                $sheet->mergeCells('E4:F4');
                $sheet->getStyle('D4')->getFont()->setBold(true);
                $sheet->getStyle('E4:F4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_LEFT);
                $sheet->getStyle('E4:F4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                // --- CUERPO DE LA TABLA ---
                $rowCount = $this->collection()->count();
                $firstDataRow = 8;
                $lastDataRow = $firstDataRow + $rowCount - 1;
                $lastCol = 'F'; // Última columna de este reporte

                if ($rowCount > 0) {
                    $sheet->getStyle("A{$firstDataRow}:{$lastCol}{$lastDataRow}")->applyFromArray([
                        'borders' => [
                            'allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]
                        ],
                        'font' => ['size' => 10],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                    ]);
                    
                    // Centrar columnas específicas (Origen, Destino, Usuario)
                    $sheet->getStyle("B{$firstDataRow}:E{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);

                    // Formato de número para Peso (Columna F)
                    $sheet->getStyle("F{$firstDataRow}:F{$lastDataRow}")->getNumberFormat()->setFormatCode('#,##0.00');
                }

                // --- TOTALES ---
                $totalRow = $lastDataRow + 1;
                $sheet->setCellValue("A{$totalRow}", 'TOTAL GENERAL');
                $sheet->mergeCells("A{$totalRow}:E{$totalRow}"); // Merge hasta antes del total

                // Suma de la columna F (Peso)
                $sheet->setCellValue("F{$totalRow}", "=SUM(F{$firstDataRow}:F{$lastDataRow})");

                $sheet->getStyle("A{$totalRow}:{$lastCol}{$totalRow}")->applyFromArray([
                    'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 10],
                    'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '1F4E79']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER],
                    'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN]]
                ]);
                
                $sheet->getStyle("F{$totalRow}")->getNumberFormat()->setFormatCode('#,##0.00');
            },
        ];
    }
}