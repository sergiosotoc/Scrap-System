<!-- resources/views/pdf/registro-scrap.blade.php -->
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Registro Scrap - {{ $registro->id }}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; font-size: 12px; }
        .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 20px; }
        .section { margin: 15px 0; }
        .section-title { background-color: #f5f5f5; padding: 8px; font-weight: bold; }
        .detail-row { display: flex; margin-bottom: 5px; }
        .detail-label { width: 200px; font-weight: bold; }
        .table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; }
        .total { font-weight: bold; font-size: 14px; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #666; }
    </style>
</head>
<body>
    <div class="header">
        <h1>PESAJE SCRAP COF MX</h1>
        <h2>REGISTRO DETALLADO</h2>
    </div>

    <div class="section">
        <div class="section-title">INFORMACIÓN GENERAL</div>
        <div class="detail-row">
            <div class="detail-label">Fecha:</div>
            <div>{{ $registro->fecha_registro->format('d/M/Y H:i') }}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Turno:</div>
            <div>{{ $registro->turno }}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Operador:</div>
            <div>{{ $registro->operador->name }}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Área/Máquina:</div>
            <div>{{ $registro->area_real }} - {{ $registro->maquina_real }}</div>
        </div>
        <div class="detail-row">
            <div class="detail-label">Número Lote:</div>
            <div>{{ $registro->numero_lote ?? 'N/A' }}</div>
        </div>
    </div>

    <div class="section">
        <div class="section-title">DETALLES DE PESOS (kg)</div>
        <table class="table">
            <thead>
                <tr>
                    <th>Tipo de Material</th>
                    <th>Peso (kg)</th>
                </tr>
            </thead>
            <tbody>
                @if($registro->peso_cobre_estanado > 0)
                <tr><td>Cobre Estañado</td><td>{{ number_format($registro->peso_cobre_estanado, 2) }}</td></tr>
                @endif
                @if($registro->peso_purga_pvc > 0)
                <tr><td>Purga PVC</td><td>{{ number_format($registro->peso_purga_pvc, 2) }}</td></tr>
                @endif
                <!-- Repetir para todos los tipos de material -->
                <tr class="total">
                    <td><strong>TOTAL</strong></td>
                    <td><strong>{{ number_format($registro->peso_total, 2) }} kg</strong></td>
                </tr>
            </tbody>
        </table>
    </div>

    @if($registro->observaciones)
    <div class="section">
        <div class="section-title">OBSERVACIONES</div>
        <p>{{ $registro->observaciones }}</p>
    </div>
    @endif

    <div class="footer">
        <p>Sistema Automatizado de Control de Scrap - COF MX</p>
        <p>Generado el {{ now()->format('d/M/Y H:i') }}</p>
    </div>
</body>
</html>