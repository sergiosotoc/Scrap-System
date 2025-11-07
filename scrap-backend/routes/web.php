<?php
/* routes/web.php */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

// Ruta de prueba para verificar que Laravel funciona
Route::get('/', function () {
    return response()->json([
        'message' => 'Sistema de Control de Scrap - Backend funcionando',
        'status' => 'Ok'
    ]);
});
