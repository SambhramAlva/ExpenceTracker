<?php

header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET,POST,DELETE,OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$host = '127.0.0.1';
$db   = 'expenses_app';
$charset = 'utf8mb4';
$dsn = "mysql:host=$host;dbname=$db;charset=$charset";


$db_user = 'root';
$db_pass = '';

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $db_user, $db_pass, $options);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'DB connection failed: '.$e->getMessage()]);
    exit();
}


function ensureUserExists($pdo, $email, $full_name = null, $password_hash = null) {
    if (!$email) return false;
    
    if ($password_hash !== null) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO users (email, full_name, password_hash) VALUES (:e, :n, :p)");
        $stmt->execute([':e' => $email, ':n' => $full_name, ':p' => $password_hash]);
        return true;
    }
    
    $stmt = $pdo->prepare("INSERT IGNORE INTO users (email) VALUES (:e)");
    $stmt->execute([':e' => $email]);
    return true;
}
