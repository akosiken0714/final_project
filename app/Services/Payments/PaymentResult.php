<?php

namespace App\Services\Payments;

final class PaymentResult
{
    public function __construct(
        public readonly bool $success,
        public readonly ?string $reference = null,
        public readonly ?string $maskedNumber = null,
        public readonly string $message = '',
    ) {
    }
}
