# Backup e segurança de dados — produção Navarro

Documento para reduzir risco de perda de dados antes do uso oficial.

---

## 1. Backup automático no Supabase

### Como verificar

1. Acesse [Supabase Dashboard](https://supabase.com/dashboard) → seu projeto.
2. Vá em **Project Settings → Database → Backups**.
3. Confirme:
   - **Daily backups** estão habilitados.
   - Retenção conforme o plano (ex.: 7 dias no Free, mais no Pro).

### Point-in-Time Recovery (PITR)

| Plano | Backup diário | PITR |
|-------|---------------|------|
| Free | Sim (retenção limitada) | **Não** |
| Pro | Sim | **Opcional** (add-on pago) |
| Team/Enterprise | Sim | Disponível conforme contrato |

**Ação obrigatória:** confirmar no painel qual plano a Navarro usa. Sem PITR, a recuperação é limitada aos snapshots diários.

---

## 2. Backup manual no painel Supabase

Antes de migrations, seeds ou mudanças em massa:

1. **Database → Backups** → verifique o último backup automático.
2. Se disponível no plano: **Download backup** ou solicite restore de teste em projeto clone.
3. Anote data/hora do backup de referência.

### Projeto clone (recomendado para testes)

No plano Pro+, é possível restaurar backup em um **novo projeto** para validar migrations sem tocar produção.

---

## 3. Exportação CSV das tabelas principais

Execute no **SQL Editor** do Supabase. Salve cada resultado como CSV (botão Export no editor ou copie para planilha).

### Ordem sugerida

```sql
-- 1. Clientes
select * from public.clientes order by created_at;

-- 2. Contratos
select * from public.cliente_contratos order by data_inicio desc;

-- 3. Agendamentos
select * from public.agendamentos order by data_agendamento desc;

-- 4. Exames do agendamento
select * from public.agendamento_exames order by created_at desc;

-- 5. Clínicas
select * from public.clinicas order by nome_fantasia;

-- 6. Vínculos clínica × exame
select ce.*, c.nome_fantasia, e.nome as exame_nome
from public.clinica_exames ce
join public.clinicas c on c.id = ce.clinica_id
join public.exames e on e.id = ce.exame_id
order by c.nome_fantasia, e.nome;

-- 7. Faturas
select * from public.faturas order by created_at desc;

-- 8. Itens de fatura
select * from public.fatura_itens order by created_at desc;

-- 9. Perfis de usuários (sem senhas — auth.users fica no Auth)
select id, user_id, nome, email, perfil, ativo, created_at
from public.perfis_usuarios order by nome;
```

### Nomenclatura dos arquivos

Salve com data no nome, por exemplo:

```
backup-2026-06-09-clientes.csv
backup-2026-06-09-agendamentos.csv
...
```

Guarde em pasta segura (OneDrive corporativo, drive criptografado). **Não** commitar CSVs no GitHub.

---

## 4. Restore básico

### Restaurar projeto inteiro

- Use **Backups** no Supabase (restore para novo projeto ou contato suporte).
- Não há restore “um clique” de CSV para todas as tabelas no app — CSV é cópia de segurança e conferência.

### Restaurar registro pontual

1. Localize o registro no CSV de backup.
2. Reinsira via SQL `insert` ou pela própria tela do sistema.
3. Para FKs (ex.: `agendamento_exames` → `agendamentos`), respeite a ordem: pai antes do filho.

### Exemplo: reativar clínica inativada por engano

```sql
update public.clinicas
set status = 'ativa', updated_at = now()
where nome_fantasia = 'LABORMESP JABAQUARA';
```

---

## 5. Cuidados antes de rodar migrations

1. **Exportar CSV** das tabelas listadas acima.
2. Conferir último backup automático no Supabase.
3. Rodar migration primeiro em **ambiente de teste** (projeto clone ou branch `dev` + Supabase de staging, se existir).
4. Ler o arquivo `.sql` inteiro antes de executar.
5. Nunca rodar `delete` em massa ou `drop table` sem backup.
6. Migrations do repositório (ordem):

| Arquivo | Conteúdo resumido |
|---------|-------------------|
| `001_agendamento_historico.sql` | Histórico agendamentos |
| `002_motivo_cancelamento.sql` | Campo cancelamento |
| `003_clinicas.sql` | Clínicas + histórico |
| `004_exames_catalog.sql` | Exames + clinica_exames |
| `005_clinica_exames_valor_navarro.sql` | Coluna valor_navarro |
| `006_auth_usuarios.sql` | perfis_usuarios |
| `007_faturas.sql` | Faturas + itens |
| `008_cargos_exames.sql` | Cargos |
| `009_agendamento_exames_delete_policy.sql` | DELETE exames (edição) |
| `010_faturas_pagamento.sql` | Pagamento faturas |
| `011_faturas_mes_referencia.sql` | mes_referencia único |
| `012_cliente_contratos.sql` | Contratos |
| `013_clientes_rls.sql` | RLS clientes |
| `014_labormesp_unidades.sql` | Unidades LABORMESP |

7. Seeds: `supabase/seeds/005_exames_seed.sql` — **recria vínculos** das clínicas alvo; fazer backup de `clinica_exames` antes.

---

## 6. Regras de ouro

- **Nunca** apagar dados de produção diretamente no SQL sem backup CSV do dia.
- **Nunca** commitar `.env.local` ou chaves no GitHub.
- Preferir **cancelamento / inativação** em vez de DELETE (agendamentos cancelados, faturas canceladas, clínicas inativas).
- Manter planilha paralela por 7–15 dias no início (ver `PLANO_USO_INICIAL.md`).
- Revisar `RLS_CHECKLIST.md` antes de abrir o sistema para toda a equipe.

---

## 7. Frequência recomendada

| Momento | Ação |
|---------|------|
| Antes do go-live | CSV completo + confirmar backup Supabase |
| Antes de cada migration | CSV das tabelas afetadas |
| Semanal (1º mês) | CSV agendamentos + faturas |
| Mensal (estável) | Conferir backups automáticos no painel |
