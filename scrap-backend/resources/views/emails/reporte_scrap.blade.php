{{-- resources/views/emails/reporte_scrap.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <title>Reporte de Scrap Generado</title>
</head>
<body style="font-family: Arial, sans-serif; color: #333;">
    <h2 style="color: #2563EB;">Reporte de Scrap Generado</h2>
    <p>Hola,</p>
    <p>Se adjunta el reporte de scrap generado por el operador <strong>{{ $operadorName }}</strong>.</p>
    
    <ul>
        <li><strong>Fecha del Reporte:</strong> {{ $fecha }}</li>
        <li><strong>Turno:</strong> {{ $turno }}</li>
    </ul>

    <p>Este es un correo automático del Sistema de Control de Scrap de COFICAB.</p>
    
    <hr>
    <small style="color: #666;">No respondas a este correo.</small>
</body>
</html>