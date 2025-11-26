<?php
// app/Providers/AppConfigServiceProvider.php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\URL;

class AppConfigServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        // Configurar APP_URL dinámicamente
        $appHost = env('APP_HOST', 'localhost');
        $appUrl = "http://{$appHost}:8000";
        
        // Actualizar configuración
        config(['app.url' => $appUrl]);
        
        // Forzar URL en generación de links
        URL::forceRootUrl($appUrl);
    }
}