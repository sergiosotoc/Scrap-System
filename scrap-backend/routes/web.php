<?php
/* routes/web.php */

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;

Route::get('/', function () {
    return response()->json([
        'message' => 'Sistema de Control de Scrap - Backend funcionando',
        'status' => 'Ok'
    ]);
});

Route::get('/db-test', function () {
    try {
        DB::connection()->getPdo();
        return response()->json([
            'message' => 'Conexión exitosa a la base de datos',
            'status' => 'Ok'
        ]);
    } catch (\Exception $e) {
        return response()->json([
            'message' => 'Error de conexión: ' . $e->getMessage(),
            'status' => 'Fail'
        ]);
    }
});
