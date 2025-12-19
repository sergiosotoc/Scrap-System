<?php
// config/cors.php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Here you may configure your settings for cross-origin resource sharing
    | or "CORS". This determines what cross-origin operations may execute
    | in web browsers. You are free to adjust these settings as needed.
    |
    | To learn more: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
    |
    */

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