<?php
// routes/api.php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\RecepcionScrapController;
use App\Http\Controllers\RegistrosScrapController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\BasculaController;
use App\Http\Controllers\ExcelReportController;
use App\Http\Controllers\MaterialesController;
use App\Http\Controllers\AreasMaquinasController;
use App\Http\Controllers\DestinatariosController;

Route::middleware('api')->group(function () {
    // Autenticación
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

    // Dashboard 
    Route::middleware('auth:sanctum')->prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
    });

    // Materiales
    Route::middleware('auth:sanctum')->prefix('materiales')->group(function () {
        Route::get('/lista/{uso}', [MaterialesController::class, 'getByUso']);
        // Rutas solo Admin
        Route::middleware('role:admin')->group(function () {
            Route::get('/', [MaterialesController::class, 'index']);
            Route::post('/', [MaterialesController::class, 'store']);
            Route::delete('/{id}', [MaterialesController::class, 'destroy']);
        });
    });

    // GESTIÓN DE ÁREAS Y MÁQUINAS (Solo Admin)
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('config-areas')->group(function () {
        Route::get('/', [AreasMaquinasController::class, 'index']);
        Route::post('/', [AreasMaquinasController::class, 'store']);
        Route::delete('/{id}', [AreasMaquinasController::class, 'destroy']);
    });

    // GESTIÓN DE DESTINATARIOS DE CORREO (Solo Admin)
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('destinatarios')->group(function () {
        Route::get('/', [DestinatariosController::class, 'index']);
        Route::post('/', [DestinatariosController::class, 'store']);
        Route::delete('/{id}', [DestinatariosController::class, 'destroy']);
    });

    // Gestión de usuarios (solo admin)
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::patch('/{id}/toggle-status', [UserController::class, 'toggleStatus']);
    });

    // Báscula
    Route::middleware('auth:sanctum')->prefix('bascula')->group(function () {
        Route::get('/puertos', [BasculaController::class, 'listarPuertos']);
        Route::post('/conectar', [BasculaController::class, 'conectar']);
        Route::post('/leer-peso', [BasculaController::class, 'leerPeso']);
        Route::post('/leer-rapido', [BasculaController::class, 'leerPesoRapido']); 
        Route::post('/leer-continuo', [BasculaController::class, 'leerPesoContinuo']); 
        Route::post('/iniciar-continua', [BasculaController::class, 'iniciarLecturaContinua']); 
        Route::post('/detener-continua', [BasculaController::class, 'detenerLecturaContinua']); 
        Route::post('/desconectar', [BasculaController::class, 'desconectar']);
        Route::post('/configurar', [BasculaController::class, 'configurarBascula']);
        Route::get('/diagnostico', [BasculaController::class, 'diagnostico']);
    });

    // Registros de scrap -  NUEVA RUTA BATCH AGREGADA
    Route::middleware('auth:sanctum')->prefix('registros-scrap')->group(function () {
        Route::get('/', [RegistrosScrapController::class, 'index']);
        Route::post('/', [RegistrosScrapController::class, 'store']);
        Route::post('/batch', [RegistrosScrapController::class, 'storeBatch']); // 🔥 NUEVA RUTA
        Route::get('/configuracion', [RegistrosScrapController::class, 'getConfiguracion']);
        Route::get('/stats', [RegistrosScrapController::class, 'getRegistroScrapStats']);
    });

    // Recepciones de scrap
    Route::middleware('auth:sanctum')->prefix('recepciones-scrap')->group(function () {
        Route::get('/', [RecepcionScrapController::class, 'index']);
        Route::post('/', [RecepcionScrapController::class, 'store']);
        Route::put('/{id}', [RecepcionScrapController::class, 'update']);
    });

    // Reportes Excel y Correos
    Route::middleware('auth:sanctum')->prefix('excel')->group(function () {
        Route::get('/export-formato-empresa', [ExcelReportController::class, 'exportFormatoEmpresa']);
        Route::get('/export-recepciones', [ExcelReportController::class, 'exportReporteRecepcion']);
        
        Route::get('/preview-formato-empresa', [ExcelReportController::class, 'previewFormatoEmpresa']);
        
        Route::post('/enviar-reporte-correo', [ExcelReportController::class, 'enviarReporteCorreo']);
    });
    
    // NUEVO: Endpoint de salud para verificar conexión
    Route::get('/health', function () {
        return response()->json([
            'status' => 'ok',
            'timestamp' => now(),
            'service' => 'Scrap Management API'
        ]);
    });
});