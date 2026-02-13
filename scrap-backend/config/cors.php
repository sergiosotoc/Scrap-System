<?php
// config/cors.php

return [

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    'allowed_origins' => [],

    'allowed_origins_patterns' => [
        '#^http://192\.168\..+#', 
        '#^http://localhost.+#', 
        '#^http://127\.0\.0\.1.+#',
        '#^http://10\..+#'
    ],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];