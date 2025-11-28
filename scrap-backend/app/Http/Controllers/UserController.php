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

        } catch (ValidationException $e) {
            // Capturar errores de validación específicos
            $errors = $e->errors();
            
            if (isset($errors['username']) && in_array('The username has already been taken.', $errors['username'])) {
                return response()->json([
                    'message' => 'El nombre de usuario ya está en uso. Por favor elige otro.'
                ], 422);
            }

            // Para otros errores de validación
            return response()->json([
                'message' => 'Error de validación: ' . implode(' ', array_flatten($errors))
            ], 422);

        } catch (\Exception $e) {
            Log::error('Error al crear usuario: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error interno del servidor al crear el usuario'
            ], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $user = User::findOrFail($id);
            $currentUser = auth()->user();

            $validated = $request->validate([
                'username' => 'required|string|max:50|unique:users,username,' . $user->id,
                'name' => 'required|string|max:50',
                'role' => 'required|in:admin,operador,receptor',
                'activo' => 'required|boolean',
            ]);

            // Validar que no se puede cambiar el propio rol
            if ($id == $currentUser->id && $validated['role'] != $user->role) {
                return response()->json([
                    'message' => 'No puedes cambiar tu propio rol'
                ], 403);
            }

            // Solo actualizar password si se proporciona
            if ($request->filled('password')) {
                $validated['password'] = Hash::make($request->password);
            }

            $user->update($validated);

            return response()->json([
                'message' => 'Usuario actualizado correctamente',
                'user' => $user
            ]);

        } catch (ValidationException $e) {
            // Capturar errores de validación específicos
            $errors = $e->errors();
            
            if (isset($errors['username']) && in_array('The username has already been taken.', $errors['username'])) {
                return response()->json([
                    'message' => 'El nombre de usuario ya está en uso. Por favor elige otro.'
                ], 422);
            }

            return response()->json([
                'message' => 'Error de validación: ' . implode(' ', array_flatten($errors))
            ], 422);

        } catch (\Exception $e) {
            Log::error('Error al actualizar usuario: ' . $e->getMessage());
            return response()->json([
                'message' => 'Error interno del servidor al actualizar el usuario'
            ], 500);
        }
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