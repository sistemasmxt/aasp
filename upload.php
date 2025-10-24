<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Método não permitido']);
    exit;
}

if (!isset($_FILES['avatar'])) {
    echo json_encode(['success' => false, 'error' => 'Arquivo não encontrado']);
    exit;
}

$file = $_FILES['avatar'];
$userId = $_POST['userId'] ?? 'unknown';

// Verificar se o diretório img existe, se não, criar
$uploadDir = 'img/';
if (!is_dir($uploadDir)) {
    mkdir($uploadDir, 0755, true);
}

// Gerar nome único para o arquivo
$fileName = $userId . '_' . time() . '_' . uniqid() . '.jpg';
$uploadPath = $uploadDir . $fileName;

// Verificar tipo de arquivo (apenas imagens)
$allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
if (!in_array($file['type'], $allowedTypes)) {
    echo json_encode(['success' => false, 'error' => 'Tipo de arquivo não permitido']);
    exit;
}

// Verificar tamanho do arquivo (máx 10MB)
if ($file['size'] > 10 * 1024 * 1024) {
    echo json_encode(['success' => false, 'error' => 'Arquivo muito grande']);
    exit;
}

// Mover arquivo para o diretório
if (move_uploaded_file($file['tmp_name'], $uploadPath)) {
    echo json_encode(['success' => true, 'path' => '/' . $uploadPath]);
} else {
    echo json_encode(['success' => false, 'error' => 'Falha no upload']);
}
?>
