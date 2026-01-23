{{-- resources/views/emails/reporte_scrap.blade.php --}}
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>{{ $asunto }}</title>
</head>
<body style="font-family: Arial, sans-serif; color: #000000; font-size: 14px; margin: 0; padding: 0;">
    
    {{-- Asunto principal --}}
    <p style="font-weight: bold; font-size: 16px; margin: 0; padding: 0;">{{ $asunto }}</p>
    
    {{-- Espacios en blanco --}}
    <br><br><br>
    
    {{-- Saludo --}}
    <p style="margin: 0; padding: 0;">Saludos cordiales.</p>
    <br>

    {{-- Firma del operador --}}
    <p style="font-weight: bold; margin-bottom: 0; padding: 0;">{{ $operadorName }}</p>
    {{-- Solo mostrar puesto si no está vacío --}}
    @if(!empty($operadorPuesto))
    <p style="margin-top: 0; padding: 0; color: #444;">{{ $operadorPuesto }}</p>
    @endif
    
    <br>
    
    {{-- Nombre de la empresa --}}
    <p style="font-weight: bold; color: #1E3A8A; margin: 0; padding: 0;">COFICAB Mx S. de R. L. de C.V.</p>

</body>
</html>