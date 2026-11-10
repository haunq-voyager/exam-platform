<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * The web app sends the language the user picked in `X-Locale` ("vi" or "en"); validation messages and other
 * framework texts of that request are then produced in it. Anything else keeps the application default (vi).
 */
class SetLocale
{
    private const SUPPORTED = ['vi', 'en'];

    public function handle(Request $request, Closure $next): Response
    {
        $locale = strtolower((string) $request->header('X-Locale'));
        if (in_array($locale, self::SUPPORTED, true)) {
            app()->setLocale($locale);
        }

        return $next($request);
    }
}
