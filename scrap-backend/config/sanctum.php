<?php
/* config/sanctum.php */

use Laravel\Sanctum\Sanctum;

$serverIp = isset($_SERVER['SERVER_ADDR']) ? $_SERVER['SERVER_ADDR'] : '127.0.0.1';
$requestHost = isset($_SERVER['HTTP_HOST']) ? explode(':', $_SERVER['HTTP_HOST'])[0] : 'localhost';

return [

    'stateful' => array_filter([
        'localhost',
        'localhost:3002',
        '127.0.0.1',
        '127.0.0.1:3002',
        $requestHost . ':3002',
        env('APP_URL') ? parse_url(env('APP_URL'), PHP_URL_HOST) : null,
    ]),

    'guard' => ['web'],

    'expiration' => null,

    'token_prefix' => env('SANCTUM_TOKEN_PREFIX', ''),

    'middleware' => [
        'authenticate_session' => Laravel\Sanctum\Http\Middleware\AuthenticateSession::class,
        'encrypt_cookies' => Illuminate\Cookie\Middleware\EncryptCookies::class,
        'validate_csrf_token' => Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class,
    ],

];