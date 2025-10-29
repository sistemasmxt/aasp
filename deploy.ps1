$ErrorActionPreference = "Stop"

# Configurações
$localPath = Join-Path $PSScriptRoot "dist"
$remotePath = "/var/www/html/aasp.app.br"
$username = "root"
$hostname = "31.97.164.107"

# Verificar se o OpenSSH está instalado
if (!(Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "OpenSSH não está instalado. Por favor, instale-o primeiro."
    exit 1
}

try {
    # Criar uma sessão SSH
    Write-Host "Conectando ao servidor..."
    ssh "${username}@${hostname}" "mkdir -p $remotePath"

    # Copiar os arquivos
    Write-Host "Copiando arquivos..."
    scp -r "$localPath/*" "${username}@${hostname}:$remotePath"

    Write-Host "Deploy concluído com sucesso!"
} catch {
    Write-Error "Erro durante o deploy: $_"
    exit 1
}