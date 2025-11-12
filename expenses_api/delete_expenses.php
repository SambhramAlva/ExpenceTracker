<?php
require 'db.php';

if (!isset($_GET['user']) || empty($_GET['user'])) {
    http_response_code(400);
    echo json_encode(['error' => 'user query parameter required']);
    exit();
}
$user = trim($_GET['user']);
ensureUserExists($pdo, $user);

try {
    $stmt = $pdo->prepare("DELETE FROM expenses WHERE user = :u");
    $stmt->execute(['u' => $user]);
    echo json_encode(['deleted' => $stmt->rowCount()]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
