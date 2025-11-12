<?php
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

$email = trim($input['email'] ?? '');
$full_name = trim($input['full_name'] ?? '');
$password = $input['password'] ?? '';

if (!$email || !$password) {
    http_response_code(400);
    echo json_encode(['error' => 'Email and password are required']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid email format']);
    exit();
}

try {
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = :e");
    $stmt->execute([':e' => $email]);
    $existing = $stmt->fetch();
    if ($existing) {
        http_response_code(409);
        echo json_encode(['error' => 'User already exists']);
        exit();
    }

    $hash = password_hash($password, PASSWORD_DEFAULT);
    $stmt = $pdo->prepare("INSERT INTO users (email, full_name, password_hash) VALUES (:e, :n, :p)");
    $stmt->execute([':e' => $email, ':n' => $full_name, ':p' => $hash]);

    http_response_code(201);
    echo json_encode(['ok' => true, 'email' => $email, 'full_name' => $full_name]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
