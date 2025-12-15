<?php
/* routes/web.php */

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;

Route::get('/', function () {
    return response()->json([
        'message' => 'Sistema de Control de Scrap - Backend funcionando',
        'status' => 'Ok'
    ]);
});
