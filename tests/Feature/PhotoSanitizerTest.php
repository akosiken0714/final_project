<?php

namespace Tests\Feature;

use App\Models\Service;
use App\Models\User;
use App\Support\PhotoSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PhotoSanitizerTest extends TestCase
{
    use RefreshDatabase;

    // A tiny file whose HEADER claims a huge picture. It costs nothing to make, but decoding it would eat memory.
    private function hugePng(int $w, int $h): string
    {
        $ihdr = pack('NNCCCCC', $w, $h, 8, 2, 0, 0, 0);

        return "\x89PNG\r\n\x1a\n"
            .pack('N', 13).'IHDR'.$ihdr.pack('N', crc32('IHDR'.$ihdr))
            .pack('N', 0).'IEND'.pack('N', crc32('IEND'));
    }

    public function test_a_photo_with_too_many_pixels_is_refused_before_decoding(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->createWithContent('big.png', $this->hugePng(10000, 10000));

        try {
            PhotoSanitizer::store($file);
            $this->fail('A 100 megapixel photo should be refused.');
        } catch (ValidationException $e) {
            $this->assertArrayHasKey('photo', $e->errors());
        }

        $this->assertSame([], Storage::disk('local')->allFiles());
    }

    public function test_a_very_long_thin_photo_is_refused(): void
    {
        Storage::fake('local');
        $file = UploadedFile::fake()->createWithContent('thin.png', $this->hugePng(10001, 2));

        $this->expectException(ValidationException::class);
        PhotoSanitizer::store($file);
    }

    public function test_the_order_form_shows_the_error_and_makes_no_order(): void
    {
        Storage::fake('local');
        $service = Service::create(['name' => 'Wash', 'unit' => 'kg', 'price' => 45, 'active' => true]);

        $this->actingAs(User::factory()->create())
            ->post('/orders', [
                'service_id' => $service->id,
                'quantity' => 2,
                'fulfillment' => 'dropoff',
                'payment_method' => 'cash',
                'photo' => UploadedFile::fake()->createWithContent('big.png', $this->hugePng(10000, 10000)),
                'photo_confirmed' => 1,
            ])
            ->assertSessionHasErrors('photo');

        $this->assertDatabaseCount('orders', 0);
    }

    public function test_a_normal_photo_is_saved_as_a_jpeg(): void
    {
        Storage::fake('local');

        $path = PhotoSanitizer::store(UploadedFile::fake()->image('ok.jpg', 800, 600));

        Storage::disk('local')->assertExists($path);
        $this->assertStringEndsWith('.jpg', $path);
    }

    public function test_a_transparent_png_gets_a_white_background_not_black(): void
    {
        Storage::fake('local');

        $im = imagecreatetruecolor(40, 40);
        imagealphablending($im, false);
        imagesavealpha($im, true);
        imagefill($im, 0, 0, (int) imagecolorallocatealpha($im, 0, 0, 0, 127)); // fully transparent
        ob_start();
        imagepng($im);
        $png = (string) ob_get_clean();

        $path = PhotoSanitizer::store(UploadedFile::fake()->createWithContent('clear.png', $png));

        $out = imagecreatefromstring(Storage::disk('local')->get($path));
        $this->assertNotFalse($out);
        $rgb = imagecolorat($out, 5, 5);
        $this->assertGreaterThan(240, ($rgb >> 16) & 0xFF);
        $this->assertGreaterThan(240, ($rgb >> 8) & 0xFF);
        $this->assertGreaterThan(240, $rgb & 0xFF);
    }
}
