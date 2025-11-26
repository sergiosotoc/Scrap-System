<?php
/* config/excel.php */
return [
    'exports' => [
        'chunk_size' => 1000,
        'pre_calculate_formulas' => false,
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
            'creator' => 'Sistema Scrap COF',
            'lastModifiedBy' => 'Sistema Scrap COF',
            'title' => 'Reporte Scrap',
            'description' => 'Reporte generado automáticamente',
            'subject' => 'Reporte Scrap',
            'keywords' => 'scrap,reporte,excel',
            'category' => 'Reportes',
            'manager' => 'Sistema Scrap COF',
            'company' => 'COF MX',
        ],
    ],
];