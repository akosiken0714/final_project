<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

class AvatarController extends Controller
{
    // A profile picture can be seen by its owner and by admins. Nobody else.
    /**
     * @return StreamedResponse
     */
    public function show(Request $request, User $user)
    {
        $viewer = $request->user();

        abort_unless($viewer && ($viewer->id === $user->id || $viewer->isAdmin()), 404);
        abort_unless($user->avatar_path && Storage::disk('local')->exists($user->avatar_path), 404);

        /** @var FilesystemAdapter $storage */
        $storage = Storage::disk('local');

        return $storage->response($user->avatar_path, null, [
            'Cache-Control' => 'private, max-age=86400',
            'X-Content-Type-Options' => 'nosniff',
        ]);
    }
}
