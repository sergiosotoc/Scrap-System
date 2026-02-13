<?php
/* /app/Providers/AppServiceProvider.php */

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
    }
    public function boot(): void
    {
        if (!app()->runningInConsole()) {
            $request = request();
            $host = $request->getHost(); 
            
            $scheme = $request->getScheme();
            $port = $request->getPort();
            $appUrl = $scheme . '://' . $host . ($port ? ':' . $port : '');
            
            URL::forceRootUrl($appUrl);
            Config::set('app.url', $appUrl);

            $currentStateful = Config::get('sanctum.stateful', []);
            
            $dynamicStateful = [
                $host,             
                $host . ':3002',    
                'localhost:3002',
                '127.0.0.1:3002'
            ];
            
            Config::set('sanctum.stateful', array_unique(array_merge($currentStateful, $dynamicStateful)));
        }
    }
}