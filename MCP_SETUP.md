# Configuração do MCP PostgreSQL no Cursor

Este guia explica como configurar o servidor MCP (Model Context Protocol) do PostgreSQL no Cursor para trabalhar com o banco de dados do Hybrid-Service.

## Pré-requisitos

1. **PostgreSQL rodando**: O banco de dados deve estar em execução. Se estiver usando Docker Compose:
   ```bash
   docker-compose up -d
   ```

2. **Arquivo `.env` configurado**: Certifique-se de que o arquivo `.env` na raiz do projeto contém a `DATABASE_URL` correta:
   ```env
   DATABASE_URL=postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service
   ```

## Configuração do MCP no Cursor

### Método 1: Via Interface do Cursor (Recomendado)

1. Abra as configurações do Cursor:
   - **Windows/Linux**: `Ctrl + ,` ou `Ctrl + Shift + P` → "Preferences: Open Settings"
   - **Mac**: `Cmd + ,` ou `Cmd + Shift + P` → "Preferences: Open Settings"

2. Navegue até **"Features"** → **"Model Context Protocol"** ou procure por "MCP" nas configurações

3. Encontre o servidor **"postgres"** ou **"PostgreSQL"** na lista de servidores MCP

4. Configure os seguintes campos:
   
   - **Command**: 
     ```
     npx
     ```
   
   - **Args**: (adicione cada argumento em uma linha separada ou como array JSON)
     ```
     -y
     @modelcontextprotocol/server-postgres
     postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service
     ```
   
   - **Env** (opcional): Se preferir usar variável de ambiente, você pode configurar:
     ```json
     {
       "DATABASE_URL": "postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service"
     }
     ```
     E então usar no args:
     ```
     -y
     @modelcontextprotocol/server-postgres
     ${DATABASE_URL}
     ```

### Método 2: Via arquivo de configuração JSON

Se o Cursor usar um arquivo de configuração JSON para MCP servers, você pode configurar diretamente. O arquivo geralmente está localizado em:

- **Windows**: `%APPDATA%\Cursor\User\globalStorage\mcp.json` ou similar
- **Mac**: `~/Library/Application Support/Cursor/User/globalStorage/mcp.json`
- **Linux**: `~/.config/Cursor/User/globalStorage/mcp.json`

O formato esperado seria:

```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": [
        "-y",
        "@modelcontextprotocol/server-postgres",
        "postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service"
      ]
    }
  }
}
```

## Informações de Conexão

### Com Docker Compose (padrão do projeto)

- **Host**: `localhost`
- **Porta**: `5433` (mapeada de 5432 no container)
- **Usuário**: `hybrid_user`
- **Senha**: `hybrid_password`
- **Database**: `hybrid_service`
- **URL completa**: `postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service`

### Sem Docker (PostgreSQL local)

Se você estiver usando PostgreSQL instalado localmente, ajuste a URL conforme necessário:
- **Porta padrão**: `5432` (a menos que você tenha alterado)
- **URL**: `postgresql://seu_usuario:sua_senha@localhost:5432/seu_banco`

## Verificação

Após configurar o MCP:

1. **Reinicie o Cursor** completamente (feche e abra novamente)

2. Verifique se o servidor MCP aparece como **ativo** (sem o ponto vermelho de erro)

3. Teste fazendo uma pergunta sobre o banco de dados, por exemplo:
   - "Liste as tabelas do banco de dados"
   - "Mostre o schema da tabela de tickets"

## Troubleshooting

### Erro: "Please provide a database URL as a command-line argument"

**Causa**: O servidor MCP não está recebendo a URL do banco como argumento.

**Solução**: 
- Verifique se o campo **Args** está configurado corretamente
- Certifique-se de que a URL completa está no último argumento
- Tente reiniciar o Cursor após alterar as configurações

### Erro: "Connection refused" ou "Connection timeout"

**Causa**: O PostgreSQL não está acessível ou não está rodando.

**Solução**:
- Verifique se o PostgreSQL está rodando: `docker-compose ps`
- Se usar Docker, certifique-se de que o container está rodando: `docker-compose up -d`
- Verifique se a porta está correta (5433 para Docker, 5432 para local)
- Teste a conexão manualmente:
  ```bash
  psql postgresql://hybrid_user:hybrid_password@localhost:5433/hybrid_service
  ```

### Erro: "Package no longer supported"

**Causa**: O pacote `@modelcontextprotocol/server-postgres@0.6.2` está deprecated.

**Solução**: 
- Este é apenas um aviso. O pacote ainda funciona, mas você pode verificar se há uma versão mais recente ou alternativa
- Se o erro impedir o funcionamento, considere usar uma versão específica ou buscar alternativas no [cursor.directory](https://cursor.directory/mcp/postgresql)

### MCP aparece ativo mas não responde

**Solução**:
- Verifique os logs do MCP no Cursor (clique em "Show Output" no servidor MCP)
- Certifique-se de que as credenciais do banco estão corretas
- Verifique se o banco de dados foi criado: `docker-compose exec postgres psql -U hybrid_user -d hybrid_service -c "\dt"`

## Recursos Adicionais

- [Documentação oficial do MCP](https://modelcontextprotocol.io/)
- [Cursor MCP Directory - PostgreSQL](https://cursor.directory/mcp/postgresql)
- [Documentação do PostgreSQL](https://www.postgresql.org/docs/)

## Notas

- A configuração do MCP é **específica do Cursor** e não afeta outras ferramentas
- As credenciais na URL são **sensíveis** - não commite o arquivo de configuração do MCP com credenciais em repositórios públicos
- Se você mudar as credenciais no `.env`, lembre-se de atualizar também a configuração do MCP
