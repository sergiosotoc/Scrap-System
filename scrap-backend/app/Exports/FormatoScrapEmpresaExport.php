<?php
/* app/Exports/FormatoScrapEmpresaExport.php */
namespace App\Exports;

use App\Models\RegistrosScrap;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use Maatwebsite\Excel\Concerns\WithEvents;
use Maatwebsite\Excel\Events\AfterSheet;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;
use PhpOffice\PhpSpreadsheet\Style\Alignment;
use PhpOffice\PhpSpreadsheet\Style\Border;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Style\Font;
use PhpOffice\PhpSpreadsheet\Worksheet\Drawing;

class FormatoScrapEmpresaExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle, WithEvents
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
        return 'CONTROL_SCRAP';
    }

    public function headings(): array
    {
        return [
            // Fila 1: Encabezado principal (se mantiene igual)
            ['COF MEXICO S.A. DE C.V.'],
            // Fila 2: Información de la empresa
            ['REPORTE DE CONTROL DE SCRAP - PRODUCCIÓN'],
            // Fila 3: Datos del reporte
            ['FECHA DEL REPORTE:', $this->fecha, '', 'TURNO:', $this->turno ?: 'TODOS'],
            // Fila 4: Información del operador
            ['OPERADOR:', $this->user->name, '', 'FECHA DE GENERACIÓN:', now()->format('Y-m-d H:i:s')],
            // Fila 5: Espacio en blanco
            [],
            [
                'ÁREA',
                'MÁQUINA',
                'COBRE (KG)',
                'COBRE ESTAÑADO (KG)',
                'PURGA PVC (KG)',
                'PURGA PE (KG)', 
                'PURGA PUR (KG)',
                'PURGA PP (KG)',
                'CABLE PVC (KG)',
                'CABLE PE (KG)',
                'CABLE PUR (KG)',
                'CABLE PP (KG)',
                'CABLE ALUMINIO (KG)',
                'CABLE ESTAÑADO PVC (KG)',
                'CABLE ESTAÑADO PE (KG)',
                'TOTAL (KG)',
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
        ];
    }

    public function styles(Worksheet $sheet)
    {
        // Configurar anchos de columnas (MANTENER ORIGINAL)
        $sheet->getColumnDimension('A')->setWidth(18); // ÁREA
        $sheet->getColumnDimension('B')->setWidth(20); // MÁQUINA
        $sheet->getColumnDimension('C')->setWidth(12); // COBRE
        $sheet->getColumnDimension('D')->setWidth(15); // COBRE ESTAÑADO
        $sheet->getColumnDimension('E')->setWidth(12); // PURGA PVC
        $sheet->getColumnDimension('F')->setWidth(12); // PURGA PE
        $sheet->getColumnDimension('G')->setWidth(12); // PURGA PUR
        $sheet->getColumnDimension('H')->setWidth(12); // PURGA PP
        $sheet->getColumnDimension('I')->setWidth(12); // CABLE PVC
        $sheet->getColumnDimension('J')->setWidth(12); // CABLE PE
        $sheet->getColumnDimension('K')->setWidth(12); // CABLE PUR
        $sheet->getColumnDimension('L')->setWidth(12); // CABLE PP
        $sheet->getColumnDimension('M')->setWidth(15); // CABLE ALUMINIO
        $sheet->getColumnDimension('N')->setWidth(18); // CABLE ESTAÑADO PVC
        $sheet->getColumnDimension('O')->setWidth(18); // CABLE ESTAÑADO PE
        $sheet->getColumnDimension('P')->setWidth(12); // TOTAL

        // Combinar celdas para encabezados: logo en A1:B1 y A2:B2, textos en C1:P1 y C2:P2
        $sheet->mergeCells('A1:B1');
        $sheet->mergeCells('A2:B2');
        $sheet->mergeCells('C1:P1');
        $sheet->mergeCells('C2:P2');

        $sheet->mergeCells('B3:D3');
        $sheet->mergeCells('E3:F3');
        $sheet->mergeCells('B4:D4');
        $sheet->mergeCells('E4:F4');

        return [
            // Fila 1: Nombre de la empresa (MEJORAR CONTRASTE) - mantengo tu estilo pero ahora aplicado a  C1:P1 via AfterSheet
            1 => [
                'font' => [
                    'bold' => true, 
                    'size' => 16,
                    'color' => ['rgb' => 'FFFFFF'] // Texto blanco para mejor contraste
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2F75B5'] // Azul más oscuro
                ]
            ],
            // Fila 2: Título del reporte (MEJORAR CONTRASTE) - se aplicará a C2:P2
            2 => [
                'font' => [
                    'bold' => true, 
                    'size' => 14,
                    'color' => ['rgb' => '1F4E79'] // Azul oscuro
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'BDD7EE'] // Azul claro
                ]
            ],
            // Fila 3: Información de fecha y turno (MANTENER ORIGINAL)
            3 => [
                'font' => [
                    'bold' => true,
                    'size' => 11,
                    'color' => ['rgb' => '000000'] // Negro para mejor legibilidad
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'FFE699'] // Amarillo claro
                ]
            ],
            // Fila 4: Información del operador (MANTENER ORIGINAL)
            4 => [
                'font' => [
                    'bold' => true,
                    'size' => 11,
                    'color' => ['rgb' => '000000'] // Negro para mejor legibilidad
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => 'FFE699'] // Amarillo claro
                ]
            ],
            // Fila 6: Encabezados de la tabla (MANTENER ORIGINAL)
            6 => [
                'font' => [
                    'bold' => true, 
                    'size' => 10,
                    'color' => ['rgb' => 'FFFFFF']
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER,
                    'wrapText' => true
                ],
                'fill' => [
                    'fillType' => Fill::FILL_SOLID,
                    'startColor' => ['rgb' => '2F75B5']
                ],
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => '1F4E79']
                    ]
                ]
            ],
            // Estilos para los datos (MANTENER ORIGINAL)
            'A7:P1000' => [
                'borders' => [
                    'allBorders' => [
                        'borderStyle' => Border::BORDER_THIN,
                        'color' => ['rgb' => 'BFBFBF']
                    ]
                ],
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_CENTER,
                    'vertical' => Alignment::VERTICAL_CENTER
                ]
            ],
            // Formato numérico para las columnas de peso (MANTENER ORIGINAL)
            'C7:P1000' => [
                'numberFormat' => [
                    'formatCode' => '0.000'
                ]
            ],
            // Estilo para las columnas de texto (MANTENER ORIGINAL)
            'A7:B1000' => [
                'alignment' => [
                    'horizontal' => Alignment::HORIZONTAL_LEFT
                ]
            ],
        ];
    }

    public function registerEvents(): array
    {
        return [
            AfterSheet::class => function(AfterSheet $event) {
                try {
                    // AGREGAR LOGO EN POSICIÓN (A1) Y HACERLO VISUALMENTE OCUPAR A1:B2
                    $logoPath = storage_path('app/public/Logo-COFICAB.png');

                    if (file_exists($logoPath)) {
                        $drawing = new Drawing();
                        $drawing->setName('Logo COF');
                        $drawing->setDescription('Logo COFICAB');
                        $drawing->setPath($logoPath);

                        $drawing->setHeight(50);    // ✔ más pequeño
                        $drawing->setCoordinates('A1');
                        $drawing->setOffsetX(0);
                        $drawing->setOffsetY(0);
                        $drawing->setWorksheet($event->sheet->getDelegate());
                    }

                    // ✔ Evitamos que salga texto detrás del logo
                    $event->sheet->setCellValue('A1', '');
                    $event->sheet->setCellValue('A2', '');

                    // APLICAR FONDO OSCURO EN A1:B2 para que las letras blancas del logo se vean
                    $event->sheet->getStyle('A1:B2')->applyFromArray([
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => '2F75B5'] // mismo azul que usas
                        ]
                    ]);

                    // Asegurarnos que las celdas combinadas de C1:P1 y C2:P2 tengan el texto y estilo centrado
                    $event->sheet->setCellValue('C1', 'COF MEXICO S.A. DE C.V.');
                    $event->sheet->setCellValue('C2', 'REPORTE DE CONTROL DE SCRAP - PRODUCCIÓN');

                    // Aplicar estilo de fondo/centrado a C1:P1 y C2:P2 para que se vean consistentes
                    $event->sheet->getStyle('C1:P1')->applyFromArray([
                        'font' => [
                            'bold' => true,
                            'size' => 16,
                            'color' => ['rgb' => 'FFFFFF']
                        ],
                        'alignment' => [
                            'horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical' => Alignment::VERTICAL_CENTER
                        ],
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => '2F75B5']
                        ]
                    ]);

                    $event->sheet->getStyle('C2:P2')->applyFromArray([
                        'font' => [
                            'bold' => true,
                            'size' => 14,
                            'color' => ['rgb' => 'FFFFFF']
                        ],
                        'alignment' => [
                            'horizontal' => Alignment::HORIZONTAL_CENTER,
                            'vertical' => Alignment::VERTICAL_CENTER
                        ],
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'BDD7EE']
                        ]
                    ]);

                    // Agregar totales al final (MANTENER ORIGINAL)
                    $lastRow = $this->registros->count() + 6; // +6 por las filas de encabezado

                    // Fila de totales
                    $event->sheet->setCellValue("A{$lastRow}", 'TOTALES GENERALES');
                    $event->sheet->mergeCells("A{$lastRow}:B{$lastRow}");

                    // Calcular totales por columna
                    $columns = ['C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];
                    foreach ($columns as $column) {
                        $event->sheet->setCellValue("{$column}{$lastRow}", "=SUM({$column}7:{$column}" . ($lastRow - 1) . ")");
                    }

                    // Estilo para la fila de totales
                    $event->sheet->getStyle("A{$lastRow}:P{$lastRow}")->applyFromArray([
                        'font' => [
                            'bold' => true,
                            'color' => ['rgb' => '1F4E79']
                        ],
                        'fill' => [
                            'fillType' => Fill::FILL_SOLID,
                            'startColor' => ['rgb' => 'E2EFDA']
                        ],
                        'borders' => [
                            'allBorders' => [
                                'borderStyle' => Border::BORDER_MEDIUM,
                                'color' => ['rgb' => '2F75B5']
                            ]
                        ]
                    ]);

                    // Agregar nota al pie
                    $noteRow = $lastRow + 2;
                    $event->sheet->setCellValue("A{$noteRow}", "NOTA: Este reporte fue generado automáticamente por el Sistema de Control de Scrap COF MX");
                    $event->sheet->mergeCells("A{$noteRow}:P{$noteRow}");
                    $event->sheet->getStyle("A{$noteRow}")->applyFromArray([
                        'font' => [
                            'italic' => true,
                            'size' => 9,
                            'color' => ['rgb' => '7F7F7F']
                        ],
                        'alignment' => [
                            'horizontal' => Alignment::HORIZONTAL_CENTER
                        ]
                    ]);

                } catch (\Exception $e) {
                    // Si hay error con el logo, continuar sin él
                    \Log::error('Error al agregar logo al Excel: ' . $e->getMessage());
                }
            },
        ];
    }
}
