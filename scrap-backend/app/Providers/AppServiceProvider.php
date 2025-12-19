<?php
/* /app/Providers/AppServiceProvider.php */

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // --- DETECCIÓN AUTOMÁTICA DE IP ---
        // Esto permite que el backend funcione en cualquier IP local sin editar .env
        
        if (!app()->runningInConsole()) {
            $request = request();
            $host = $request->getHost(); // Ej: 192.168.1.15
            
            // 1. Configurar URL base de la aplicación dinámicamente
            $scheme = $request->getScheme();
            $port = $request->getPort();
            $appUrl = $scheme . '://' . $host . ($port ? ':' . $port : '');
            
            URL::forceRootUrl($appUrl);
            Config::set('app.url', $appUrl);

            // 2. Configurar dominios de Sanctum dinámicamente
            // Agregamos la IP detectada y el puerto del frontend (3000)
            $currentStateful = Config::get('sanctum.stateful', []);
            
            $dynamicStateful = [
                $host,              // La IP sola
                $host . ':3000',    // La IP con puerto de React
                'localhost:3000',
                '127.0.0.1:3000'
            ];
            
            Config::set('sanctum.stateful', array_unique(array_merge($currentStateful, $dynamicStateful)));
        }
    }
}