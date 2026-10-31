<?php

namespace App\Http\Controllers;

abstract class Controller
{
    //

    protected function text(\Illuminate\Http\Request $request, string $key, string $default = ''): string
    {
        $v = $request->query($key);

        return is_string($v) ? $v : $default;
    }
}
