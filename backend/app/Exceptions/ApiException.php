<?php

namespace App\Exceptions;

use RuntimeException;
use Symfony\Component\HttpFoundation\Response;

class ApiException extends RuntimeException
{
    public function __construct(
        string $message,
        public readonly string $messageCode,
        public readonly int $status = Response::HTTP_UNPROCESSABLE_ENTITY,
    ) {
        parent::__construct($message);
    }
}
