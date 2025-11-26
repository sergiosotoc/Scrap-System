<?php
// app/Console/Commands/ServeNetwork.php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class ServeNetwork extends Command
{
    protected $signature = 'serve:network {host?} {--port=8000}';
    protected $description = 'Serve the application on the network';

    public function handle()
    {
        $host = $this->argument('host') ?: env('APP_HOST', 'localhost');
        $port = $this->option('port');

        $this->info("🚀 Starting server on http://{$host}:{$port}");
        $this->info("📱 Accessible from any device on the same network");
        $this->info("💡 Update APP_HOST in .env to change the IP");

        // Actualizar .env temporalmente si se proporciona un host
        if ($this->argument('host')) {
            $this->updateEnvFile($host);
        }

        // Ejecutar servidor
        passthru("php -S {$host}:{$port} -t public");
    }

    protected function updateEnvFile($host)
    {
        $envPath = base_path('.env');
        $envContent = file_get_contents($envPath);
        
        // Actualizar APP_HOST
        $updatedContent = preg_replace(
            '/^APP_HOST=.*$/m',
            "APP_HOST={$host}",
            $envContent
        );
        
        file_put_contents($envPath, $updatedContent);
    }
}