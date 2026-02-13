<?php
/* config/excel.php */
return [
    'exports' => [
        'chunk_size' => 1000,
        'pre_calculate_formulas' => true,
        'strict_null_comparison' => false,
        'csv' => [
            'delimiter' => ',',
            'enclosure' => '"',
            'line_ending' => PHP_EOL,
            'use_bom' => false,
            'include_separator_line' => false,
            'excel_compatibility' => false,
            'output_encoding' => '',
        ],
        'properties' => [
            'creator' => 'COF MEXICO S.A. DE C.V.',
            'lastModifiedBy' => 'Sistema Control Scrap',
            'title' => 'Control de Scrap - Reporte de Producción',
            'description' => 'Reporte oficial de control de scrap generado automáticamente',
            'subject' => 'Control de Scrap',
            'keywords' => 'scrap,control,produccion,reporte,cof,mexico',
            'category' => 'Reportes de Producción',
            'manager' => 'Departamento de Producción',
            'company' => 'COF MEXICO S.A. DE C.V.',
        ],
    ],
];