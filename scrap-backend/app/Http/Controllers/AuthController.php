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

        // Primero buscar el usuario sin importar si está activo
        $user = User::where('username', $request->username)->first();

        if (!$user) {
            return response()->json([
                'message' => 'El usuario no existe en el sistema'
            ], 401);
        }

        // Verificar si el usuario está activo
        if (!$user->activo) {
            return response()->json([
                'message' => 'El usuario está desactivado. Contacta al administrador'
            ], 401);
        }

        // Verificar contraseña
        if (!password_verify($request->password, $user->password)) {
            return response()->json([
                'message' => 'Contraseña incorrecta'
            ], 401);
        }

        // Si todo está correcto, generar token
        $token = $user->createToken('scrap-system')->plainTextToken;
        
        return response()->json([
            'message' => 'Login exitoso',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
                'activo' => $user->activo
            ],
            'token' => $token
        ]);
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
        $user = $request->user();
        
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'username' => $user->username,
                'role' => $user->role,
                'activo' => $user->activo
            ],
            'message' => 'Usuario autenticado'
        ]);
    }
}