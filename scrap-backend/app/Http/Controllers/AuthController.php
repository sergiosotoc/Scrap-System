<?php
// app/Http/Controllers/AuthController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use App\Models\User;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string'
        ]);

        $user = User::where('username', $request->username)
                   ->where('activo', true)
                   ->first();

        if ($user && password_verify($request->password, $user->password)) {
            $token = $user->createToken('scrap-system')->plainTextToken;
            
            return response()->json([
                'message' => 'Login exitoso',
                'user' => $user,
                'token' => $token
            ]);
        }

        return response()->json([
            'message' => 'Credenciales incorrectas o usuario inactivo'
        ], 401);
    }

    public function logout(Request $request)
    {
        try {
            $user = $request->user();
            
            if ($user) {
                $user->tokens()->delete();
                return response()->json([
                    'message' => 'Logout exitoso'
                ]);
            }
            
            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        } catch (\Exception $e) {
            return response()->json([
                'error' => $e->getMessage()
            ], 500);
        }
    }

    public function user(Request $request)
    {
        return response()->json([
            'user' => $request->user(),
            'message' => 'Usuario autenticado'
        ]);
    }
}