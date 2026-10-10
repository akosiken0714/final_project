<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PhotoSanitizer
{
    public static function store(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        $mime = $file->getMimeType();

        $img = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if (! $img) {
            throw ValidationException::withMessages([
                'photo' => 'That file could not be read as a photo.',
            ]);
        }

        if (function_exists('exif_read_data') && $mime === 'image/jpeg') {
            $exif = @exif_read_data($path);
            $o = is_array($exif) ? ($exif['Orientation'] ?? 1) : 1;
            $img = match ($o) {
                3 => imagerotate($img, 180, 0) ?: $img,
                6 => imagerotate($img, -90, 0) ?: $img,
                8 => imagerotate($img, 90, 0) ?: $img,
                default => $img,
            };
        }

        $w = imagesx($img);
        $h = imagesy($img);
        $max = 1600;
        if (max($w, $h) > $max) {
            $ratio = $max / max($w, $h);
            $img = imagescale($img, (int) round($w * $ratio), (int) round($h * $ratio)) ?: $img;
        }

        ob_start();
        imagejpeg($img, null, 82);
        $bytes = ob_get_clean();
        imagedestroy($img);

        $storagePath = 'orders/'.Str::uuid().'.jpg';
        Storage::disk('local')->put($storagePath, $bytes);

        return $storagePath;
    }
}
