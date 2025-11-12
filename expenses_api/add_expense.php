<?php
require 'db.php';

$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON input']);
    exit();
}

$user = $input['user'] ?? null;
$title = $input['title'] ?? null;
$amount = isset($input['amount']) ? (float)$input['amount'] : null;
$payer = $input['payer'] ?? null;
$people = $input['people'] ?? null;

if (!$user || !$title || $amount === null || !$payer || !is_array($people) || count($people) === 0) {
    http_response_code(400);
    echo json_encode(['error' => 'Missing or invalid fields']);
    exit();
}

ensureUserExists($pdo, $user);

try {
    $stmt = $pdo->prepare("INSERT INTO expenses (user, title, amount, payer, people) VALUES (:user, :title, :amount, :payer, :people)");
    $stmt->execute([
        ':user' => $user,
        ':title' => $title,
        ':amount' => $amount,
        ':payer' => $payer,
        ':people' => json_encode($people)
    ]);
    $lastId = $pdo->lastInsertId();
    $stmt2 = $pdo->prepare("SELECT id, user, title, amount, payer, people, created_at FROM expenses WHERE id = :id");
    $stmt2->execute(['id' => $lastId]);
    $row = $stmt2->fetch();
    if ($row) $row['people'] = json_decode($row['people'], true) ?? [];
    http_response_code(201);
    echo json_encode($row);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['error' => $e->getMessage()]);
}
