# Imagem base
FROM node:20-alpine AS build

# Define diretório de trabalho
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (para cache)
COPY package*.json ./

# Instala dependências
RUN npm install --legacy-peer-deps --force

# Copia o restante do projeto
COPY . .

# Gera build de produção (caso seja um app frontend ou Next.js)
RUN npm run build

# ========================
# Etapa final: Servidor
# ========================
FROM node:20-alpine

WORKDIR /app

# Copia apenas o build final e dependências
COPY --from=build /app /app

EXPOSE 8080
CMD ["npm", "start"]
