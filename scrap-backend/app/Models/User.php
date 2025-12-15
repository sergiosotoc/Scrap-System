<?php
// app/Models/User.php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    use HasFactory, HasApiTokens;

    protected $fillable = [
        'username',
        'name', 
        'password',
        'role'
    ];

    protected $hidden = [
        'password',
    ];

    public function registrosScrap()
    {
        return $this->hasMany(RegistrosScrap::class, 'operador_id');
    }

    public function recepcionesScrap()
    {
        return $this->hasMany(RecepcionesScrap::class, 'receptor_id');
    }

    public function scopeActivos($query)
    {
        return $query;
    }

    public function scopePorRol($query, $rol)
    {
        return $query->where('role', $rol);
    }
}