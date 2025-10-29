<?php
// Configurações
$localPath = __DIR__ . '/dist/';
$remotePath = '/home/weffprog/aasp.app.br/';
$host = 'ftp.wefferson.dev.br';
$username = 'weffprog';

// Solicitar senha
$password = getenv('FTP_PASSWORD');
if (!$password) {
    echo "Por favor, defina a variável de ambiente FTP_PASSWORD\n";
    exit(1);
}

// Função recursiva para fazer upload de diretório
function uploadDirectory($ftp, $localDir, $remoteDir) {
    $items = scandir($localDir);
    
    foreach ($items as $item) {
        if ($item == '.' || $item == '..') continue;
        
        $localPath = $localDir . $item;
        $remotePath = $remoteDir . $item;
        
        if (is_dir($localPath)) {
            // Criar diretório remoto se não existir
            if (!@ftp_chdir($ftp, $remotePath)) {
                ftp_mkdir($ftp, $remotePath);
            }
            ftp_chdir($ftp, $remoteDir);
            
            // Upload recursivo do diretório
            uploadDirectory($ftp, $localPath . '/', $remotePath . '/');
        } else {
            // Upload do arquivo
            if (!@ftp_put($ftp, $remotePath, $localPath, FTP_BINARY)) {
                echo "Erro ao fazer upload de $localPath\n";
            } else {
                echo "Upload de $localPath concluído\n";
            }
        }
    }
}

// Conectar ao FTP
$ftp = ftp_connect($host);
if (!$ftp) {
    die("Não foi possível conectar ao servidor FTP\n");
}

// Login
if (!@ftp_login($ftp, $username, $password)) {
    die("Não foi possível fazer login no servidor FTP\n");
}

// Ativar modo passivo
ftp_pasv($ftp, true);

// Iniciar upload
echo "Iniciando upload dos arquivos...\n";
uploadDirectory($ftp, $localPath, $remotePath);

// Fechar conexão
ftp_close($ftp);
echo "Deploy concluído!\n";
?>