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
    $stmt = $pdo->prepare("SELECT id, user, title, amount, payer, people, created_at FROM expenses WHERE user = :u ORDER BY id DESC");
    $stmt->execute(['u' => $user]);
    $rows = $stmt->fetchAll();
    foreach ($rows as &$r) {
        $r['people'] = json_decode($r['people'], true) ?? [];
    }
    echo json_encode($rows);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
