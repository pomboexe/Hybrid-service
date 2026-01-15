# Hybrid Service - Sistema de Atendimento Híbrido

Sistema de atendimento ao cliente com integração de IA e atendimento humano.

## Pré-requisitos

- Node.js (versão 18 ou superior)
- Docker e Docker Compose (opcional, mas recomendado para o banco de dados)
- PostgreSQL (banco de dados) - ou use Docker
- npm ou yarn

## Instalação

1. Clone o repositório (se ainda não tiver feito):

```bash
git clone <url-do-repositorio>
cd Hybrid-Service
```

2. Instale as dependências:

```bash
npm install
```

## Configuração

### Banco de Dados com Docker (Recomendado)

A forma mais fácil de configurar o banco de dados é usando Docker Compose:

1. **Inicie o PostgreSQL com Docker:**

   ```bash
   docker-compose up -d
   ```

2. **Configure a variável de ambiente `DATABASE_URL`:**

   - **Windows (PowerShell):**
     ```powershell
     $env:DATABASE_URL="postgresql://hybrid_user:hybrid_password@localhost:5432/hybrid_service"
     ```
   - **Windows (CMD):**
     ```cmd
     set DATABASE_URL=postgresql://hybrid_user:hybrid_password@localhost:5432/hybrid_service
     ```
   - **Linux/Mac:**
     ```bash
     export DATABASE_URL="postgresql://hybrid_user:hybrid_password@localhost:5432/hybrid_service"
     ```

3. **Execute as migrações do banco de dados:**
   ```bash
   npm run db:push
   ```

**Comandos úteis do Docker:**

- `docker-compose up -d` - Inicia o banco em background
- `docker-compose down` - Para e remove o container
- `docker-compose logs -f postgres` - Ver logs do PostgreSQL
- `docker-compose ps` - Ver status dos containers

### Banco de Dados Manual (Sem Docker)

Se preferir instalar o PostgreSQL manualmente:

1. Crie um banco de dados PostgreSQL
2. Configure a variável de ambiente `DATABASE_URL`:

   - **Windows (PowerShell):**
     ```powershell
     $env:DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
     ```
   - **Windows (CMD):**
     ```cmd
     set DATABASE_URL=postgresql://usuario:senha@localhost:5432/nome_do_banco
     ```
   - **Linux/Mac:**
     ```bash
     export DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
     ```

3. Execute as migrações do banco de dados:

```bash
npm run db:push
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz do projeto (copie de `env.example`):

**Variáveis Obrigatórias:**

```env
# Database - Credenciais do PostgreSQL (usadas pelo Docker Compose)
POSTGRES_USER=hybrid_user
POSTGRES_PASSWORD=hybrid_password
POSTGRES_DB=hybrid_service

# Database URL - use as credenciais acima para construir a URL
DATABASE_URL=postgresql://hybrid_user:hybrid_password@localhost:5432/hybrid_service

# Session Secret - gere uma string aleatória segura
# No Linux/Mac: openssl rand -base64 32
# No Windows PowerShell: -join ((48..57) + (65..90) + (97..122) | Get-Random -Count 32 | ForEach-Object {[char]$_})
SESSION_SECRET=sua_chave_secreta_super_segura_aqui
```

**Variáveis Opcionais:**

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# OpenAI (opcional - apenas se usar funcionalidades de IA)
AI_INTEGRATIONS_OPENAI_API_KEY=sk-sua-chave-openai-aqui
AI_INTEGRATIONS_OPENAI_BASE_URL=https://api.openai.com/v1

# Authentication (opcional)
# Se definir como "true", a autenticação será obrigatória
REQUIRE_AUTH=false
```

**Para começar rapidamente:**

1. Copie o arquivo de exemplo: `cp env.example .env` (Linux/Mac) ou copie manualmente no Windows
2. Edite o `.env` e configure pelo menos `DATABASE_URL` e `SESSION_SECRET`
3. Se usar Docker, a `DATABASE_URL` já está configurada no exemplo

## Como Rodar

### Modo Desenvolvimento

**Windows (PowerShell):**

```powershell
$env:NODE_ENV="development"; npm run dev
```

**Windows (CMD):**

```cmd
set NODE_ENV=development && npm run dev
```

**Linux/Mac:**

```bash
npm run dev
```

O servidor estará disponível em `http://localhost:5000` (ou na porta especificada pela variável `PORT`).

### Modo Produção

1. Primeiro, faça o build do projeto:

```bash
npm run build
```

2. Configure as variáveis de ambiente para produção:

```powershell
# Windows PowerShell
$env:NODE_ENV="production"
$env:DATABASE_URL="postgresql://usuario:senha@localhost:5432/nome_do_banco"
```

3. Inicie o servidor:

```bash
npm start
```

## Scripts Disponíveis

- `npm run dev` - Inicia o servidor em modo desenvolvimento
- `npm run build` - Compila o projeto para produção
- `npm start` - Inicia o servidor em modo produção
- `npm run check` - Verifica erros de TypeScript
- `npm run db:push` - Aplica as migrações do banco de dados

## Estrutura do Projeto

- `client/` - Aplicação React (frontend)
- `server/` - Servidor Express (backend)
- `shared/` - Código compartilhado entre cliente e servidor
- `attached_assets/` - Assets e recursos

## Porta

Por padrão, o servidor roda na porta **5000**. Você pode alterar isso definindo a variável de ambiente `PORT`.

## Troubleshooting

### Erro: "DATABASE_URL must be set"

- Certifique-se de que a variável de ambiente `DATABASE_URL` está configurada corretamente
- Verifique se o PostgreSQL está rodando e acessível

### Erro ao rodar `npm run dev` no Windows

- Use o formato PowerShell ou CMD mostrado acima
- Ou instale o pacote `cross-env` e modifique o script no `package.json`

### Erro de conexão com o banco

- **Com Docker:** Verifique se o container está rodando: `docker-compose ps`
- **Sem Docker:** Verifique se o PostgreSQL está rodando
- Confirme que as credenciais na `DATABASE_URL` estão corretas
- Verifique se o banco de dados foi criado
- Se usar Docker, aguarde alguns segundos após `docker-compose up` para o banco inicializar completamente
