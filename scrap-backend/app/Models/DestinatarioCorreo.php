<?php
/* app/Models/DestinatarioCorreo.php */

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DestinatarioCorreo extends Model
{
    use HasFactory;

    protected $table = 'destinatarios_correos';

    protected $fillable = [
        'nombre',
        'email',
    ];
}