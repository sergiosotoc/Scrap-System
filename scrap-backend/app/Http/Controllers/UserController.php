<?php
// app/Http/Controllers/UserController.php
namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\ValidationException;

class UserController extends Controller
{
    public function index()
    {
        $users = User::orderBy('name')->get();
        return response()->json($users);
    }

    public function store(Request $request)
    {
        try {
            $messages = [
                'username.required' => 'El usuario es obligatorio.',
                'username.unique' => 'Este nombre de usuario ya está registrado.',
                'password.required' => 'La contraseña es obligatoria.',
                'password.min' => 'La contraseña debe tener al menos 6 caracteres.',
                'name.required' => 'El nombre completo es obligatorio.',
                'role.required' => 'Debes seleccionar un rol.',
                'role.in' => 'El rol seleccionado no es válido.'
            ];

            $validated = $request->validate([
                'username' => 'required|string|unique:users|max:50',
                'password' => 'required|string|min:6',
                'name' => 'required|string|max:50',
                'role' => 'required|in:' . implode(',', array_keys(config('roles'))),
            ], $messages);

            $user = User::create([
                'username' => $validated['username'],
                'password' => Hash::make($validated['password']),
                'name' => $validated['name'],
                'role' => $validated['role'],
            ]);

            return response()->json([
                'message' => 'Usuario creado correctamente',
                'user' => $user
            ], 201);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $e->errors() 
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error al crear usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno del servidor: ' . $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = auth()->user();

            $messages = [
                'username.required' => 'El usuario es obligatorio.',
                'username.unique' => 'Este nombre de usuario ya está en uso por otro empleado.',
                'name.required' => 'El nombre completo es obligatorio.',
                'role.required' => 'El rol es obligatorio.',
            ];

            $validated = $request->validate([
                'username' => 'required|string|max:50|unique:users,username,' . $user->id,
                'name' => 'required|string|max:50',
                'role' => 'required|in:' . implode(',', array_keys(config('roles'))),
            ], $messages);

            if ($id == $currentUser->id && $validated['role'] != $user->role) {
                return response()->json(['message' => 'No puedes cambiar tu propio rol'], 403);
            }

            if ($request->filled('password')) {
                if (strlen($request->password) < 6) {
                    throw ValidationException::withMessages(['password' => 'La nueva contraseña debe tener al menos 6 caracteres.']);
                }
                $validated['password'] = Hash::make($request->password);
            }

            $user->update($validated);

            return response()->json([
                'message' => 'Usuario actualizado correctamente',
                'user' => $user
            ]);

        } catch (ValidationException $e) {
            return response()->json([
                'message' => 'Error de validación',
                'errors' => $e->errors()
            ], 422);
        } catch (\Exception $e) {
            Log::error('Error al actualizar usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno del servidor'], 500);
        }
    }

    public function destroy($id)
    {
        $currentUserId = auth()->id();
        if ($id == $currentUserId) {
            return response()->json(['message' => 'No puedes eliminar tu propio usuario'], 403);
        }

        $user = User::findOrFail($id);
        $user->delete();

        return response()->json(['message' => 'Usuario eliminado correctamente']);
    }
}