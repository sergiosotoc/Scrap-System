<?php
/* app/Exports/RecepcionesScrapExport.php */
namespace App\Exports;

use App\Models\RecepcionesScrap;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class RecepcionesScrapExport implements FromCollection, WithHeadings, WithMapping, WithStyles
{
    protected $recepciones;

    public function __construct($recepciones)
    {
        $this->recepciones = $recepciones;
    }

    public function collection()
    {
        return $this->recepciones;
    }

    public function headings(): array
    {
        return [
            'Número HU',
            'Fecha Entrada',
            'Peso (kg)',
            'Tipo Material',
            'Origen Tipo',
            'Origen Específico',
            'Receptor',
            'Destino',
            'Ubicación Almacenamiento',
            'Observaciones'
        ];
    }

    public function map($recepcion): array
    {
        return [
            $recepcion->numero_hu,
            $recepcion->fecha_entrada ? $recepcion->fecha_entrada->format('d/m/Y H:i') : 'N/A',
            $recepcion->peso_kg,
            $recepcion->tipo_material,
            $recepcion->origen_tipo,
            $recepcion->origen_especifico,
            $recepcion->receptor ? $recepcion->receptor->name : 'N/A',
            $recepcion->destino,
            $recepcion->lugar_almacenamiento ?? 'N/A',
            $recepcion->observaciones ?? 'N/A'
        ];
    }

    public function styles(Worksheet $sheet)
    {
        return [
            1 => ['font' => ['bold' => true]],
            'A:J' => ['alignment' => ['vertical' => 'center']],
        ];
    }
}