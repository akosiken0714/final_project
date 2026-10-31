<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LegalPagesTest extends TestCase
{
    use RefreshDatabase;

    public function test_legal_pages_are_public(): void
    {
        foreach (['privacy', 'terms', 'refund'] as $page) {
            $this->get('/'.$page)->assertOk();
        }
    }

    public function test_unknown_page_is_not_found(): void
    {
        $this->get('/secret-page')->assertNotFound();
    }
}
