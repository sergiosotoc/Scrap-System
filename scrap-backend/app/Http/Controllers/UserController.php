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

        // ✅ CORREGIDO: Solo actualizar password si se proporciona
        if ($request->filled('password')) {
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

        if ($id == $currentUserId) {
            return response()->json([
                'message' => 'No puedes eliminar tu propio usuario'
            ], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json([
            'message' => 'Usuario eliminado correctamente'
        ]);
    }

    public function toggleStatus($id)
    {
        if ($id == auth()->id()) {
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