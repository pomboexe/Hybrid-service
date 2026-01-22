# Troubleshooting: Problema de DNS com Supabase

## Problema
O hostname `db.mgfrfhwxbrbrqfcmbgoa.supabase.co` não está sendo resolvido pelo Node.js, mesmo que:
- ✅ A connection string está correta (conforme dashboard do Supabase)
- ✅ O `nslookup` do Windows consegue resolver (retorna IPv6)
- ✅ O MCP do Supabase consegue conectar

## Possíveis Causas

1. **Node.js não está usando IPv6**
   - O Node.js pode estar configurado para usar apenas IPv4
   - O hostname resolve apenas para IPv6

2. **Firewall/Proxy bloqueando**
   - Sua rede pode estar bloqueando conexões IPv6
   - Proxy corporativo pode estar interferindo

3. **Configuração de DNS**
   - O Node.js pode estar usando um servidor DNS diferente
   - Pode haver cache de DNS com problema

## Soluções

### Solução 1: Verificar Configuração de Rede
```bash
# Verificar se IPv6 está habilitado
ipconfig /all
```

### Solução 2: Usar Connection Pooling
No dashboard do Supabase, tente usar "Connection pooling" ao invés de "Direct connection":
- Vá em Settings > Database
- Selecione "Connection pooling" na aba Method
- Copie a connection string (formato diferente)

### Solução 3: Verificar Firewall
- Verifique se o Windows Firewall está bloqueando
- Verifique se há antivírus bloqueando conexões
- Tente desabilitar temporariamente para testar

### Solução 4: Usar VPN ou Outra Rede
- Tente conectar de outra rede (ex: hotspot do celular)
- Use uma VPN para verificar se é bloqueio de rede

### Solução 5: Contatar Suporte Supabase
Se nada funcionar, pode ser um problema específico do projeto Supabase ou da sua região.

## Status Atual
- ✅ Connection string correta no `.env`
- ❌ Node.js não consegue resolver o hostname
- ✅ Projeto Supabase está ativo (MCP funciona)
- ⏳ Aguardando solução de DNS/rede
