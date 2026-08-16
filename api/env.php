<?php

function loadEnv(string $path): void {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        $line = trim($line);
        if ($line === '' || $line[0] === '#') continue;
        $eq = strpos($line, '=');
        if ($eq === false) continue;
        $key = trim(substr($line, 0, $eq));
        $val = trim(substr($line, $eq + 1));
        putenv("$key=$val");
        $_ENV[$key] = $val;
    }
}

// Load .env.local first (takes priority), then .env as fallback
$dir = __DIR__;
loadEnv("$dir/.env.local");
loadEnv("$dir/.env");

function env(string $key, string $default = ''): string {
    return getenv($key) !== false ? getenv($key) : $default;
}
