# Checklist RLS — Row Level Security

Auditoria com base nas migrations em `supabase/migrations/`.  
**Data da revisão:** junho/2026.

---

## Legenda

| Símbolo | Significado |
|---------|-------------|
| ✅ | Política adequada para authenticated |
| ⚠️ | Política `anon` aberta — risco em produção |
| ❓ | Sem migration no repositório — validar no Supabase |
| 🗑️ | DELETE permitido (avaliar necessidade) |

---

## Resumo executivo

| Risco | Descrição |
|-------|-----------|
| **Alto** | Várias tabelas usam políticas `to anon using (true)` — qualquer pessoa com a `anon key` pode ler/escrever via API REST, **mesmo sem login no app**. |
| **Médio** | Tabela `agendamentos` não tem RLS documentada no repositório. |
| **Baixo** | Middleware Next.js bloqueia rotas sem login, mas **não substitui RLS** no banco. |

### Ação recomendada antes do go-live

1. No Supabase SQL Editor, listar políticas ativas:  
   `select * from pg_policies where schemaname = 'public';`
2. Planejar migration futura substituindo `anon` por `authenticated` nas tabelas operacionais (sem implementar agora, salvo aprovação).
3. Garantir que **service_role** nunca esteja no frontend (hoje: ✅ não encontrada no código).

---

## Tabela por tabela

### clientes

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ `013_clientes_rls.sql` | ❌ | ❌ |
| INSERT | ✅ | ❌ | — |
| UPDATE | ✅ | ❌ | — |

**Status:** Adequado para usuários logados. Sem DELETE.

---

### cliente_contratos

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ `012` | ❌ | ❌ |
| INSERT | ✅ | ❌ | — |
| UPDATE | ✅ | ❌ | — |

**Status:** Adequado. Renovação = novo registro + update status.

---

### agendamentos

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ❓ | ❓ | ❓ |
| INSERT | ❓ | ❓ | — |
| UPDATE | ❓ | ❓ | — |

**Status:** ⚠️ **Validar no Supabase.** Não há migration de RLS no repositório. App usa cancelamento (`status = cancelado`), não DELETE.

---

### agendamento_exames

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ❓ | ❓ | — |
| INSERT | ❓ | ❓ | — |
| UPDATE | ❓ | ❓ | — |
| DELETE | 🗑️ `009` authenticated + anon | 🗑️ | Necessário para editar exames do agendamento |

**Status:** DELETE intencional na edição (substitui linhas). Confirmar SELECT/INSERT/UPDATE restritos a authenticated em produção.

---

### clinicas

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon `true` | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |
| UPDATE | ⚠️ anon | ⚠️ | — |

**Status:** ⚠️ **Risco.** App inativa clínica (`status = inativa`), não apaga.

---

### clinica_exames

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon `true` | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |
| UPDATE | ⚠️ anon | ⚠️ | — |

**Status:** ⚠️ **Risco.** Edição de custo/valor Navarro grava histórico em `clinica_exames_historico`.

---

### clinicas_historico

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |

**Status:** Append-only no app. Sem UPDATE/DELETE nas policies.

---

### clinica_exames_historico

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |

**Status:** Registra alteração de custo e valor Navarro.

---

### exames (catálogo global)

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |
| UPDATE | ⚠️ anon | ⚠️ | — |

**Status:** ⚠️ Catálogo global — alterações afetam referência. Histórico em `exames_historico`.

---

### cargos / cargo_exames

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ `008` | ❌ | — |
| INSERT | ✅ | ❌ | — |
| UPDATE | ✅ | ❌ | — |
| DELETE cargo_exames | 🗑️ authenticated | — | Edição de vínculos |

**Status:** Adequado. Apenas admin acessa rotas `/cargos` e `/exames` (middleware + perfil).

---

### faturas

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ `007` | ❌ | ❌ |
| INSERT | ✅ | ❌ | — |
| UPDATE | ✅ | ❌ | — |

**Status:** Cancelamento = `status cancelada`, não DELETE.

---

### fatura_itens

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ | ❌ | — |
| INSERT | ✅ | ❌ | — |
| DELETE | 🗑️ authenticated | — | Pode ser usado em fluxos de emissão |

**Status:** Sem UPDATE policy — itens são imutáveis após emissão (correto).

---

### perfis_usuarios

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ✅ todos autenticados | ❌ | ❌ |
| UPDATE | ✅ apenas próprio `user_id` | ❌ | — |
| INSERT | ❌ policy no repo | — | Criar via SQL/admin |

**Status:** Inserção de perfis feita manualmente no Supabase ao criar usuário Auth.

---

### agendamento_historico

| Operação | authenticated | anon | DELETE |
|----------|---------------|------|--------|
| SELECT | ⚠️ anon | ⚠️ | ❌ |
| INSERT | ⚠️ anon | ⚠️ | — |

**Status:** App registra criação, edição e cancelamento.

---

## Controle de acesso no app (camada extra)

| Camada | O que faz |
|--------|-----------|
| `middleware.ts` | Redireciona sem login para `/login` |
| `lib/perfil-access.ts` | Operacional não acessa Exames, Cargos, Usuários |
| Supabase Auth | Sessão JWT para `authenticated` |

**Importante:** perfil `operacional` vs `admin` é validado no **frontend**. RLS não diferencia perfis hoje — todos authenticated têm mesmas permissões nas tabelas `authenticated_*`.

---

## Checklist antes do go-live

- [ ] Rodar `select * from pg_policies where schemaname = 'public'` no Supabase
- [ ] Confirmar migration `013_clientes_rls.sql` aplicada
- [ ] Confirmar `012_cliente_contratos.sql` aplicada
- [ ] Validar RLS de `agendamentos` (criar migration se estiver aberta)
- [ ] Decidir data para migrar políticas `anon` → `authenticated` em clínicas/exames
- [ ] Confirmar que `service_role` **não** está em variáveis Vercel públicas
- [ ] Criar usuários Auth + linhas em `perfis_usuarios` para cada colaborador
