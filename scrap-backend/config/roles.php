<?php 
/* config/roles.php */
return [
    'admin' => [
        'label' => 'Administrador',
        'color' => 'primary',
        'permissions' => ['*']
    ],
    'operador' => [
        'label' => 'Operador de Logística',
        'color' => 'secondary'
    ],
    'receptor' => [
        'label' => 'Receptor de Scrap',
        'color' => 'warning'
    ],
    'contraloria' => [
        'label' => 'Contraloría',
        'color' => 'gray'
    ]
];
