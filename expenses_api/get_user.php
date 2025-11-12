<?php
require 'db.php';

if (!isset($_GET['user']) || empty($_GET['user'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user query parameter required']);
    exit();
}

$email = trim($_GET['user']);

try {
    $stmt = $pdo->prepare("SELECT email, full_name FROM users WHERE email = :e LIMIT 1");
    $stmt->execute([':e' => $email]);
    $user = $stmt->fetch();

    if (!$user) {
        http_response_code(404);
        echo json_encode(['error' => 'User not found']);
        exit();
    }

    // If full_name is empty, fallback to email
    $display = !empty($user['full_name']) ? $user['full_name'] : $user['email'];

    echo json_encode([
        'email' => $user['email'],
        'full_name' => $user['full_name'],
        'display' => $display
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
