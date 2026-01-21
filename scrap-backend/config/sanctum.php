<?php
/* config/sanctum.php */

use Laravel\Sanctum\Sanctum;

// Obtenemos la IP del servidor actual dinámicamente para permitir CORS/Stateful
$serverIp = isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '127.0.0.1';
// Intentamos obtener el host de la petición para casos de red local (ej. 192.168.1.50)
$requestHost = isset($_SERVER['HTTP_HOST']) ? explode(':', $_SERVER['HTTP_HOST'])[0] : 'localhost';

return [

    /*
    |--------------------------------------------------------------------------
    | Stateful Domains
    |--------------------------------------------------------------------------
    |
    | Aquí definimos qué dominios (Frontend) pueden hacer peticiones con autenticación (SPA).
    | He agregado lógica para incluir automáticamente tu IP local + puerto 3002.
    |
    */

    'stateful' => array_filter([
        'localhost',
        'localhost:3002',
        '127.0.0.1',
        '127.0.0.1:3002',
        // Esto permite que la IP detectada de tu red funcione en el puerto 3002
        $requestHost . ':3002',
        env('APP_URL') ? parse_url(env('APP_URL'), PHP_URL_HOST) : null,
    ]),

    /*
    |--------------------------------------------------------------------------
    | Guard
    |--------------------------------------------------------------------------
    */

    'guard' => ['web'],

    /*
    |--------------------------------------------------------------------------
    | Expiration
    |--------------------------------------------------------------------------
    */

    'expiration' => null,

    /*
    |--------------------------------------------------------------------------
    | Token Prefix
    |--------------------------------------------------------------------------
    */

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    /*
    |--------------------------------------------------------------------------
    | Middleware
    |--------------------------------------------------------------------------
    */

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];