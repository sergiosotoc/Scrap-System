<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\HttpFoundation\BinaryFileResponse; 
use Symfony\Component\HttpFoundation\StreamedResponse;   

class GzipCompression
{
    public function handle(Request $request, Closure $next): Response
    {
        $response = $next($request);

        if ($response instanceof BinaryFileResponse || $response instanceof StreamedResponse) {
            return $response;
        }

        if (function_exists('gzencode') && 
            !$response->headers->has('Content-Encoding') && 
            str_contains($request->header('Accept-Encoding'), 'gzip')) {
            
            $content = $response->getContent();
            
            if (!empty($content)) {
                $compressed = gzencode($content, 9);

                if ($compressed !== false) {
                    $response->setContent($compressed);
                    $response->headers->add([
                        'Content-Encoding' => 'gzip',
                        'Vary' => 'Accept-Encoding',
                        'Content-Length' => strlen($compressed),
                    ]);
                }
            }
        }

        return $response;
    }
}