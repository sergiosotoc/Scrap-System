<?php
// app/Http/Controllers/UserController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function index()
    {
        $users = User::orderBy('name')->get();

        return response()->json($users);
    }

    public function store(Request $request)
    {
        Log::info('UserController@store called', $request->all());
        
        $validated = $request->validate([
            'username' => 'required|string|unique:users|max:50',
            'password' => 'required|string|min:6',
            'name' => 'required|string|max:50',
            'role' => 'required|in:admin,operador,receptor',
        ]);

        $user = User::create([
            'username' => $validated['username'],
            'password' => Hash::make($validated['password']),
            'name' => $validated['name'],
            'role' => $validated['role'],
            'activo' => true,
        ]);

        return response()->json([
            'message' => 'Usuario creado correctamente',
            'user' => $user
        ], 201);
    }

    public function update(Request $request, $id)
    {
        $user = User::findOrFail($id);

        $validated = $request->validate([
            'username' => 'required|string|max:50|unique:users,username,' . $user->id,
            'name' => 'required|string|max:50',
            'role' => 'required|in:admin,operador,receptor',
            'activo' => 'required|boolean',
        ]);

        // Si se proporciona nueva contraseña
        if ($request->has('password') && $request->password) {
            $validated['password'] = Hash::make($request->password);
        }

        $user->update($validated);

        return response()->json([
            'message' => 'Usuario actualizado correctamente',
            'user' => $user
        ]);
    }

    public function destroy($id)
    {
        $currentUserId = auth()->id();
        $currentUser = auth()->user();

        Log::info('Verificación de autenticación:', [
            'current_user_id' => $currentUserId,
            'current_user' => $currentUser ? $currentUser->username : 'null',
            'user_to_delete' => $id
        ]);

        if (!$currentUserId) {
            return response()->json([
                'message' => 'Usuario no autenticado'
            ], 401);
        }

        if ($id == $currentUserId) {
            return response()->json([
                'message' => 'No puedes eliminar tu propio usuario'
            ], 403);
        }

        Log::info('Intentando eliminar usuario:', [
            'user_id_a_eliminar' => $id,
            'Usuario_actual' => auth()->id(),
            'son_iguales' => $id == auth()->id()
        ]);

        $user = User::findOrFail($id);
        $user->delete();

        Log::info('Usuario eliminado exitosamente:', ['user_id' => $id]);

        return response()->json([
            'message' => 'Usuario eliminado correctamente'
        ]);
    }

    public function toggleStatus($id)
    {
        Log::info('Intentando cambiar el estado de usuario:', [
            'user_id' => $id,
            'usuario_actual' => auth()->id()
        ]);

        if ($id == auth()->id()) {
            Log::warning('Intento de desactivar usuario actual bloqueado');
            return response()->json([
                'message' => 'No puedes desactivar tu propio usuario'
            ], 403);
        }

        $user = User::findOrFail($id);
        $user->activo = !$user->activo;
        $user->save();

        $status = $user->activo ? 'activado' : 'desactivado';

        return response()->json([
            'message' => "Usuario {$status} correctamente",
            'user' => $user
        ]);
    }
}