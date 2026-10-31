<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Turns an uploaded photo into a clean, small JPEG (no EXIF/GPS, no hidden data).
// A small file can still unpack into a HUGE picture in memory, so the size in pixels is checked
// BEFORE the picture is decoded.
class PhotoSanitizer
{
    // 20 megapixels covers phone cameras (12 to 16 MP is normal) and refuses "decompression bomb" files.
    public const MAX_PIXELS = 20_000_000;

    // No side longer than this, however few pixels the total is (e.g. 1 x 20,000,000).
    public const MAX_SIDE = 10_000;

    // What we keep: the longest side is shrunk to this many pixels.
    public const OUTPUT_MAX_SIDE = 1600;

    private const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];

    public static function store(UploadedFile $file): string
    {
        $path = (string) $file->getRealPath();

        // Reads only the file header: cheap, and tells us the size before we decode anything.
        $info = @getimagesize($path);

        if ($info === false || ! in_array($info['mime'] ?? '', self::ALLOWED, true)) {
            self::refuse('That file could not be read as a photo.');
        }

        $w = (int) $info[0];
        $h = (int) $info[1];
        $mime = (string) $info['mime'];

        if ($w < 1 || $h < 1) {
            self::refuse('That file could not be read as a photo.');
        }

        if ($w * $h > self::MAX_PIXELS || max($w, $h) > self::MAX_SIDE || ! self::fitsInMemory($w, $h)) {
            self::refuse('That photo is too large to process. Please use a smaller photo (under 20 megapixels) or lower your camera quality.');
        }

        $img = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if (! $img) {
            self::refuse('That file could not be read as a photo.');
        }

        // Shrink FIRST, so the later steps work on a small picture and use little memory.
        $max = self::OUTPUT_MAX_SIDE;
        if (max($w, $h) > $max) {
            $ratio = $max / max($w, $h);
            $img = imagescale($img, max(1, (int) round($w * $ratio)), max(1, (int) round($h * $ratio))) ?: $img;
        }

        // Phones store "which way is up" in EXIF. Turn the picture, then the EXIF is thrown away.
        if ($mime === 'image/jpeg' && function_exists('exif_read_data')) {
            $exif = @exif_read_data($path);
            $o = is_array($exif) ? ($exif['Orientation'] ?? 1) : 1;
            $img = match ($o) {
                3 => imagerotate($img, 180, 0) ?: $img,
                6 => imagerotate($img, -90, 0) ?: $img,
                8 => imagerotate($img, 90, 0) ?: $img,
                default => $img,
            };
        }

        // JPEG has no transparency (it would turn black). Put the picture on a white background first.
        $flat = imagecreatetruecolor(imagesx($img), imagesy($img));
        if ($flat !== false) {
            imagefill($flat, 0, 0, (int) imagecolorallocate($flat, 255, 255, 255));
            imagecopy($flat, $img, 0, 0, 0, 0, imagesx($img), imagesy($img));
            $img = $flat;
        }

        ob_start();
        imagejpeg($img, null, 82);
        $bytes = ob_get_clean();

        // PHP 8 frees the picture when the variable goes away (imagedestroy() is deprecated).
        unset($img, $flat);

        if (! is_string($bytes) || $bytes === '') {
            self::refuse('That file could not be read as a photo.');
        }

        $storagePath = 'orders/'.Str::uuid().'.jpg';
        Storage::disk('local')->put($storagePath, $bytes);

        return $storagePath;
    }

    // A decoded picture needs about 4 bytes per pixel (plus a working copy). Make sure the server has room,
    // so a big photo gives a friendly message instead of a crash.
    private static function fitsInMemory(int $w, int $h): bool
    {
        $limit = (int) ini_parse_quantity((string) ini_get('memory_limit'));

        if ($limit <= 0) {
            return true; // -1 = no limit
        }

        return memory_get_usage() + ($w * $h * 5) < $limit;
    }

    private static function refuse(string $message): never
    {
        throw ValidationException::withMessages(['photo' => $message]);
    }
}
