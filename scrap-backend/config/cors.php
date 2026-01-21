<?php
// config/cors.php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // En lugar de 'allowed_origins' con IPs fijas, usamos patrones
    'allowed_origins' => [],

    // Esto permite cualquier IP que empiece con 192.168, localhost, etc.
    'allowed_origins_patterns' => [
        '#^http://192\.168\..+#', 
        '#^http://localhost.+#', 
        '#^http://127\.0\.0\.1.+#',
        '#^http://10\..+#' // Para otras redes locales comunes
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];