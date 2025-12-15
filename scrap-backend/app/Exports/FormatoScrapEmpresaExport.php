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
        // Aseguramos cargar los detalles para no hacer N+1 queries
        $this->registros = $registros->load('detalles.tipoScrap');
        $this->fecha = $fecha;
        $this->turno = $turno;
        $this->user = $user;
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
        return [
            'ÁREA', 'MÁQUINA',
            'COBRE', 'COBRE EST.',
            'PURGA PVC', 'PURGA PE', 'PURGA PUR', 'PURGA PP',
            'CABLE PVC', 'CABLE PE', 'CABLE PUR', 'CABLE PP', 'CABLE ALU',
            'CABLE EST. PVC', 'CABLE EST. PE',
            'TOTAL GENERAL',
        ];
    }

    public function map($registro): array
    {
        // Usamos el helper getPesoPorTipo del modelo para buscar en los detalles dinámicos
        // Mapeamos los nombres EXACTOS que tienes en tu Base de Datos (ConfigTipoScrap)
        return [
            $registro->area_real,
            $registro->maquina_real,
            (float) $registro->getPesoPorTipo('COBRE'),
            (float) $registro->getPesoPorTipo('Cobre Estañado'),
            (float) $registro->getPesoPorTipo('PURGA PVC'),
            (float) $registro->getPesoPorTipo('PURGA PE'),
            (float) $registro->getPesoPorTipo('PURGA PUR'),
            (float) $registro->getPesoPorTipo('PURGA PP'),
            (float) $registro->getPesoPorTipo('CABLE PVC'),
            (float) $registro->getPesoPorTipo('CABLE PE'),
            (float) $registro->getPesoPorTipo('CABLE PUR'),
            (float) $registro->getPesoPorTipo('CABLE PP'),
            (float) $registro->getPesoPorTipo('CABLE ALUMINIO'),
            (float) $registro->getPesoPorTipo('CABLE ESTAÑADO PVC'),
            (float) $registro->getPesoPorTipo('CABLE ESTAÑADO PE'),
            (float) $registro->peso_total, 
        ];
    }

    // ... (El resto de tus métodos styles, registerEvents, etc. se mantienen IDÉNTICOS)
    // Solo copia y pega la parte de estilos visuales de tu archivo original aquí abajo
    // ya que no cambia nada visualmente.
    
    public function styles(Worksheet $sheet)
    {
        $sheet->getColumnDimension('A')->setWidth(18);
        $sheet->getColumnDimension('B')->setWidth(25);
        foreach(range('C','P') as $col) {
            $sheet->getColumnDimension($col)->setWidth(12);
        }

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
                } catch (\Exception $e) {}

                $sheet->setCellValue('D2', 'PESAJE SCRAP COF MX');
                $sheet->mergeCells('D2:K2');
                $sheet->getStyle('D2')->applyFromArray([
                    'font' => ['bold' => true, 'size' => 20, 'color' => ['rgb' => '000000']],
                    'alignment' => ['horizontal' => Alignment::HORIZONTAL_CENTER, 'vertical' => Alignment::VERTICAL_CENTER]
                ]);

                $sheet->setCellValue('C4', 'FECHA:');
                $sheet->setCellValue('D4', Carbon::parse($this->fecha)->format('d-M-Y')); 
                $sheet->getStyle('C4')->getFont()->setBold(true);
                $sheet->getStyle('D4')->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                $sheet->getStyle('D4')->getBorders()->getBottom()->setBorderStyle(Border::BORDER_THIN);

                $turnoMap = [1 => 'PRIMER TURNO', 2 => 'SEGUNDO TURNO', 3 => 'TERCER TURNO'];
                $turnoTexto = $this->turno ? ($turnoMap[$this->turno] ?? 'TODOS') : 'TODOS';
                
                $sheet->setCellValue('G4', 'TURNO:');
                $sheet->setCellValue('H4', $turnoTexto);
                $sheet->mergeCells('H4:I4');
                $sheet->getStyle('G4')->getFont()->setBold(true);

                $sheet->setCellValue('K4', 'OPERADOR:');
                $sheet->setCellValue('L4', strtoupper($this->user->name));
                $sheet->mergeCells('L4:N4');
                $sheet->getStyle('K4')->getFont()->setBold(true);

                $rowCount = $this->registros->count();
                $firstDataRow = 8;
                $lastDataRow = $firstDataRow + $rowCount - 1;

                if ($rowCount > 0) {
                    $sheet->getStyle("A7:P{$lastDataRow}")->applyFromArray([
                        'borders' => ['allBorders' => ['borderStyle' => Border::BORDER_THIN, 'color' => ['rgb' => '000000']]],
                        'font' => ['size' => 10],
                        'alignment' => ['vertical' => Alignment::VERTICAL_CENTER]
                    ]);
                    $sheet->getStyle("C{$firstDataRow}:P{$lastDataRow}")->getAlignment()->setHorizontal(Alignment::HORIZONTAL_CENTER);
                    
                    // Fórmulas de suma por fila
                    for ($row = $firstDataRow; $row <= $lastDataRow; $row++) {
                        $sheet->setCellValue("P{$row}", "=SUM(C{$row}:O{$row})");
                    }
                }

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