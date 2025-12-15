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
        $appHost = env('APP_HOST', 'localhost');
        $appUrl = "http://{$appHost}:8000";
        
        config(['app.url' => $appUrl]);
        
        URL::forceRootUrl($appUrl);
    }
}