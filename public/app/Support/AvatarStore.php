<?php

namespace App\Support;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

// Profile pictures: re-drawn from scratch as a small square JPEG, so nothing the customer uploaded
// (hidden data, GPS tags, odd file tricks) is ever kept. Stored privately.
class AvatarStore
{
    const SIZE = 400;

    public static function store(UploadedFile $file): string
    {
        $path = $file->getRealPath();
        $mime = $file->getMimeType();
        $info = @getimagesize($path);

        // Refuse huge images before decoding them (a small file can hide a giant picture).
        if (! $info || $info[0] > 6000 || $info[1] > 6000) {
            throw ValidationException::withMessages(['avatar' => 'That picture is too large or could not be read.']);
        }

        $img = match ($mime) {
            'image/jpeg' => @imagecreatefromjpeg($path),
            'image/png' => @imagecreatefrompng($path),
            'image/webp' => @imagecreatefromwebp($path),
            default => false,
        };

        if (! $img) {
            throw ValidationException::withMessages(['avatar' => 'That file could not be read as a picture.']);
        }

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

        // Crop the middle square, then shrink it.
        $w = imagesx($img);
        $h = imagesy($img);
        $side = min($w, $h);
        $x = intdiv($w - $side, 2);
        $y = intdiv($h - $side, 2);

        $out = imagecreatetruecolor(self::SIZE, self::SIZE);
        imagefill($out, 0, 0, (int) imagecolorallocate($out, 255, 255, 255));
        imagecopyresampled($out, $img, 0, 0, $x, $y, self::SIZE, self::SIZE, $side, $side);

        ob_start();
        imagejpeg($out, null, 85);
        $bytes = ob_get_clean();
        imagedestroy($img);
        imagedestroy($out);

        $storagePath = 'avatars/'.Str::uuid().'.jpg';
        Storage::disk('local')->put($storagePath, $bytes);

        return $storagePath;
    }

    public static function delete(?string $path): void
    {
        if ($path && Storage::disk('local')->exists($path)) {
            Storage::disk('local')->delete($path);
        }
    }
}
