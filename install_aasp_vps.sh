#!/bin/bash

# Script de Instalação da Plataforma AASP na VPS
# Sistema: Ubuntu 22.04 LTS
# Data: $(date)

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Função para log
log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

error() {
    echo -e "${RED}[ERROR] $1${NC}"
}

warn() {
    echo -e "${YELLOW}[WARN] $1${NC}"
}

info() {
    echo -e "${BLUE}[INFO] $1${NC}"
}

# Verificar se está rodando como root
if [[ $EUID -ne 0 ]]; then
   error "Este script deve ser executado como root"
   exit 1
fi

log "🚀 Iniciando instalação da Plataforma AASP na VPS"

# Atualizar sistema
log "📦 Atualizando sistema..."
apt update && apt upgrade -y

# Instalar utilitários essenciais
log "🔧 Instalando utilitários essenciais..."
apt install -y curl wget git unzip software-properties-common apt-transport-https ca-certificates gnupg lsb-release ufw

# Instalar Node.js 18.x LTS
log "📦 Instalando Node.js 18.x LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs

# Verificar instalação do Node.js
node --version
npm --version

# Instalar PHP 8.1+ e extensões necessárias
log "📦 Instalando PHP 8.1+ e extensões..."
add-apt-repository ppa:ondrej/php -y
apt update
apt install -y php8.1 php8.1-cli php8.1-fpm php8.1-mysql php8.1-xml php8.1-mbstring php8.1-curl php8.1-zip php8.1-gd php8.1-intl

# Verificar instalação do PHP
php --version

# Instalar Nginx
log "🌐 Instalando Nginx..."
apt install -y nginx

# Instalar PostgreSQL (para Supabase local se necessário)
log "🗄️ Instalando PostgreSQL..."
apt install -y postgresql postgresql-contrib

# Instalar Redis (opcional, para cache)
log "📊 Instalando Redis..."
apt install -y redis-server

# Configurar firewall
log "🔥 Configurando firewall..."
ufw --force enable
ufw allow ssh
ufw allow 'Nginx Full'
ufw allow 3000
ufw allow 8080
ufw allow 8081

# Criar diretório do projeto
log "📁 Criando diretório do projeto..."
mkdir -p /var/www/aasp
cd /var/www/aasp

# Clonar repositório (ajuste a URL conforme necessário)
log "📥 Clonando repositório da aplicação..."
# git clone https://github.com/sistemasmxt/aasp.git .
# Por enquanto, assumiremos que os arquivos serão enviados via SCP

# Instalar PM2 para gerenciamento de processos Node.js
log "⚙️ Instalando PM2..."
npm install -g pm2

# Instalar dependências do projeto
log "📦 Instalando dependências do projeto..."
if [ -f "package.json" ]; then
    npm install
fi

# Configurar Nginx
log "🌐 Configurando Nginx..."
cat > /etc/nginx/sites-available/aasp << 'EOF'
server {
    listen 80;
    server_name _;

    root /var/www/aasp/dist;
    index index.html;

    # Logs
    access_log /var/log/nginx/aasp_access.log;
    error_log /var/log/nginx/aasp_error.log;

    # Configuração para SPA
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API endpoints (se houver)
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # PHP upload endpoint
    location /upload.php {
        root /var/www/aasp;
        fastcgi_pass unix:/var/run/php/php8.1-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        include fastcgi_params;
    }
}
EOF

# Habilitar site
ln -sf /etc/nginx/sites-available/aasp /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Testar configuração do Nginx
nginx -t

# Reiniciar serviços
log "🔄 Reiniciando serviços..."
systemctl restart nginx
systemctl restart php8.1-fpm
systemctl restart redis-server
systemctl restart postgresql

# Habilitar serviços na inicialização
systemctl enable nginx
systemctl enable php8.1-fpm
systemctl enable redis-server
systemctl enable postgresql

# Configurar permissões
log "🔒 Configurando permissões..."
chown -R www-data:www-data /var/www/aasp
chmod -R 755 /var/www/aasp

# Criar diretório para uploads
mkdir -p /var/www/aasp/uploads
mkdir -p /var/www/aasp/img
chown -R www-data:www-data /var/www/aasp/uploads
chown -R www-data:www-data /var/www/aasp/img

# Configurar PHP upload
log "📤 Configurando PHP para uploads..."
cat > /var/www/aasp/upload.php << 'EOF'
<?php
header('Content-Type: application/json');

// Configurações
$uploadDir = '/var/www/aasp/img/';
$maxFileSize = 500 * 1024; // 500KB
$allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

try {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        throw new Exception('Método não permitido');
    }

    if (!isset($_FILES['avatar'])) {
        throw new Exception('Nenhum arquivo enviado');
    }

    $file = $_FILES['avatar'];

    // Verificar erros do upload
    if ($file['error'] !== UPLOAD_ERR_OK) {
        throw new Exception('Erro no upload: ' . $file['error']);
    }

    // Verificar tamanho
    if ($file['size'] > $maxFileSize) {
        throw new Exception('Arquivo muito grande. Máximo: 500KB');
    }

    // Verificar tipo
    if (!in_array($file['type'], $allowedTypes)) {
        throw new Exception('Tipo de arquivo não permitido');
    }

    // Gerar nome único
    $extension = pathinfo($file['name'], PATHINFO_EXTENSION);
    $filename = uniqid('avatar_', true) . '_' . time() . '.' . $extension;
    $filepath = $uploadDir . $filename;

    // Mover arquivo
    if (!move_uploaded_file($file['tmp_name'], $filepath)) {
        throw new Exception('Erro ao salvar arquivo');
    }

    // Retornar sucesso
    echo json_encode([
        'success' => true,
        'filename' => $filename,
        'url' => '/img/' . $filename
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
EOF

# Configurar PM2 para a aplicação (se aplicável)
log "⚙️ Configurando PM2..."
if [ -f "package.json" ] && grep -q '"build"' package.json; then
    npm run build
fi

# Criar arquivo de configuração PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aasp-frontend',
    script: 'npm',
    args: 'run preview',
    cwd: '/var/www/aasp',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
EOF

# Instalar Certbot para SSL (Let's Encrypt)
log "🔒 Instalando Certbot para SSL..."
apt install -y certbot python3-certbot-nginx

# Configurar logrotate para logs da aplicação
log "📝 Configurando logrotate..."
cat > /etc/logrotate.d/aasp << 'EOF'
/var/log/nginx/aasp_*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 0644 www-data adm
    postrotate
        systemctl reload nginx
    endscript
}
EOF

# Limpar sistema
log "🧹 Limpando sistema..."
apt autoremove -y
apt autoclean -y

# Informações finais
log "✅ Instalação concluída com sucesso!"
info ""
info "📋 PRÓXIMOS PASSOS:"
info "1. Enviar arquivos da aplicação para /var/www/aasp/"
info "2. Configurar variáveis de ambiente (.env)"
info "3. Configurar domínio no Nginx"
info "4. Obter certificado SSL: certbot --nginx -d seu-dominio.com"
info "5. Iniciar aplicação: pm2 start ecosystem.config.js"
info "6. Configurar monitoramento e backup"
info ""

info "🌐 URLs de acesso:"
info "- Aplicação: http://31.97.164.107"
info "- API (se aplicável): http://31.97.164.107:3000"
info "- Upload PHP: http://31.97.164.107/upload.php"
info ""

info "🔧 Comandos úteis:"
info "- Ver status dos serviços: systemctl status nginx php8.1-fpm"
info "- Ver logs: tail -f /var/log/nginx/aasp_error.log"
info "- Reiniciar aplicação: pm2 restart aasp-frontend"
info ""

warn "⚠️  IMPORTANTE: Configure as variáveis de ambiente e banco de dados antes de iniciar a aplicação!"
