<?php
$s = @fsockopen('127.0.0.1', 3306, $errno, $errstr, 3);
if (!$s) { echo "fail: $errstr\n"; exit; }
stream_set_timeout($s, 3);
$d = fread($s, 50);
echo ($d === '' || $d === false)
    ? "connected but NO greeting (MySQL stuck)\n"
    : "greeting received, MySQL is responding\n";
