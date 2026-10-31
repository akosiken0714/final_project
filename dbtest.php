<?php
try {
    $pdo = new PDO(
        'mysql:host=127.0.0.1;port=3306;dbname=phinewash',
        'root',
        '',
        [PDO::ATTR_TIMEOUT => 5, PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]
    );
    echo "connected\n";
} catch (Throwable $e) {
    echo $e->getMessage() . "\n";
}
