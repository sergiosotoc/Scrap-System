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

Route::middleware('api')->group(function () {
    // Autenticación
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth:sanctum');
    Route::get('/user', [AuthController::class, 'user'])->middleware('auth:sanctum');

    // Dashboard
    Route::middleware('auth:sanctum')->prefix('dashboard')->group(function () {
        Route::get('/stats', [DashboardController::class, 'stats']);
        Route::get('/recent-activity', [DashboardController::class, 'recentActivity']);
        Route::get('/admin-stats', [DashboardController::class, 'adminStats']);
    });

    // Gestión de usuarios (solo admin)
    Route::middleware(['auth:sanctum', 'role:admin'])->prefix('users')->group(function () {
        Route::get('/', [UserController::class, 'index']);
        Route::post('/', [UserController::class, 'store']);
        Route::put('/{id}', [UserController::class, 'update']);
        Route::delete('/{id}', [UserController::class, 'destroy']);
        Route::patch('/{id}/toggle-status', [UserController::class, 'toggleStatus']);
    });

    /* BÁSCULA */
    Route::middleware('auth:sanctum')->prefix('bascula')->group(function () {
        Route::get('/puertos', [BasculaController::class, 'listarPuertos']);
        Route::post('/conectar', [BasculaController::class, 'conectar']);
        Route::post('/leer-peso', [BasculaController::class, 'leerPeso']);
        Route::post('/desconectar', [BasculaController::class, 'desconectar']); // ← ESTA RUTA
        Route::post('/configurar', [BasculaController::class, 'configurarBascula']);
        Route::get('/diagnostico', [BasculaController::class, 'diagnostico']);
    });

    // Registros de scrap
    Route::middleware('auth:sanctum')->prefix('registros-scrap')->group(function () {
        Route::get('/', [RegistrosScrapController::class, 'index']);
        Route::post('/', [RegistrosScrapController::class, 'store']);
        Route::get('/configuracion', [RegistrosScrapController::class, 'getConfiguracion']);
        Route::post('/conectar-bascula', [RegistrosScrapController::class, 'conectarBascula']);
        Route::get('/reportes/acumulados', [RegistrosScrapController::class, 'reportesAcumulados']);
        Route::get('/stats', [RegistrosScrapController::class, 'stats']);
        Route::get('/{id}', [RegistrosScrapController::class, 'show']);
        Route::post('/generar-reporte-diario', [RegistrosScrapController::class, 'generarReporteDiario']);
    });

    // Recepciones de scrap
    Route::middleware('auth:sanctum')->prefix('recepciones-scrap')->group(function () {
        Route::get('/', [RecepcionScrapController::class, 'index']);
        Route::get('/registros-pendientes', [RecepcionScrapController::class, 'registrosPendientes']);
        Route::post('/', [RecepcionScrapController::class, 'store']);
        Route::get('/{id}/imprimir-hu', [RecepcionScrapController::class, 'imprimirHU']);
        Route::get('/reportes/recepcion', [RecepcionScrapController::class, 'reporteRecepcion']);
        Route::get('/stock/disponible', [RecepcionScrapController::class, 'stockDisponible']);
        Route::get('/stats', [RecepcionScrapController::class, 'stats']);
        Route::get('/{id}', [RecepcionScrapController::class, 'show']);
    });
});
