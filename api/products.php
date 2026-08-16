<?php
require_once __DIR__ . '/db.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$id     = $_GET['id'] ?? null;

switch ($method) {
    case 'GET':
        $rows = $pdo->query('SELECT * FROM products ORDER BY created_at DESC')->fetchAll();
        echo json_encode($rows);
        break;

    case 'POST':
        $data = json_decode(file_get_contents('php://input'), true);
        if (!$data || empty($data['barcode'])) {
            http_response_code(400);
            echo json_encode(['error' => 'barcode is required']);
            exit;
        }
        $stmt = $pdo->prepare(
            'INSERT INTO products (id, name, barcode, stock) VALUES (?, ?, ?, ?)'
        );
        $stmt->execute([
            $data['id'] ?? uniqid('', true),
            $data['name'] ?? '',
            $data['barcode'],
            $data['stock'] ?? 0,
        ]);
        echo json_encode(['ok' => true, 'id' => $data['id'] ?? '']);
        break;

    case 'PUT':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
        $data = json_decode(file_get_contents('php://input'), true);
        $fields = [];
        $values = [];
        foreach (['name', 'barcode', 'stock'] as $col) {
            if (array_key_exists($col, $data)) {
                $fields[] = "$col = ?";
                $values[] = $data[$col];
            }
        }
        if (empty($fields)) { http_response_code(400); echo json_encode(['error' => 'nothing to update']); exit; }
        $values[] = $id;
        $pdo->prepare('UPDATE products SET ' . implode(', ', $fields) . ' WHERE id = ?')
            ->execute($values);
        echo json_encode(['ok' => true]);
        break;

    case 'DELETE':
        if (!$id) { http_response_code(400); echo json_encode(['error' => 'id required']); exit; }
        $pdo->prepare('DELETE FROM products WHERE id = ?')->execute([$id]);
        echo json_encode(['ok' => true]);
        break;

    default:
        http_response_code(405);
        echo json_encode(['error' => 'Method not allowed']);
}
