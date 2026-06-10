# Plano de uso inicial — Navarro

Estratégia para entrar em produção com **baixo risco**, mantendo planilha paralela por validação cruzada.

---

## Fase 0 — Preparação (1–2 dias)

1. Backup CSV completo (`BACKUP_PRODUCAO.md`)
2. Aplicar migrations pendentes no Supabase
3. Criar usuários e perfis
4. Executar `CHECKLIST_TESTES_PRODUCAO.md` em ambiente de teste
5. Confirmar unidades LABORMESP ativas

---

## Fase 1 — Cadastros base (dias 1–3)

**Usar no sistema:**

- Clientes
- Contratos (vigência obrigatória para agendar)
- Clínicas (conferir preços, especialmente LABORMESP)

**Manter na planilha:**

- Nada crítico ainda — ou espelho de clientes para conferência

**Objetivo:** base de clientes e contratos correta.

---

## Fase 2 — Agendamentos (dias 3–10)

**Usar no sistema:**

- Agendamentos (criação, edição, cancelamento)
- Mensagem WhatsApp para clínicas
- e-Social (marcar envios)

**Planilha paralela (7–15 dias):**

- Continuar registrando agendamentos na planilha atual
- Comparar diariamente: quantidade, cliente, clínica, valores

**Objetivo:** confiar nos preços por clínica/unidade e nas regras de bloqueio.

---

## Fase 3 — Faturamento clientes (dias 10–20)

**Usar no sistema:**

- Faturas Clientes (pré-visualizar → emitir → PDF)
- Marcar pagamento

**Planilha paralela:**

- Conferir totais faturados vs planilha financeira
- Validar bloqueio de fatura duplicada no mês

**Objetivo:** PDF e valores iguais ao processo manual.

---

## Fase 4 — Custos clínicas (dias 15–25)

**Usar no sistema:**

- Custos Clínicas (emissão e PDF)

**Conferir:**

- Totais por clínica vs notas/planilha de custos

---

## Fase 5 — Gestão (após validação)

**Usar quando fases anteriores estáveis:**

- Dashboard operacional
- Relatórios gerenciais
- Exportações PDF/Excel

---

## Regras durante o período de validação

| Regra | Motivo |
|-------|--------|
| Planilha paralela 7–15 dias | Detectar divergência antes de depender só do sistema |
| Não apagar dados de teste sem backup | Evitar perda irreversível |
| Alterações de preço só via tela Clínicas | Rastreio em `clinica_exames_historico` |
| Cancelar em vez de apagar | Agendamentos e faturas preservam histórico |
| Um responsável por conferência diária | Bruna/Rafaela alternando revisão |

---

## Critérios para desligar a planilha

Todos devem ser atendidos:

- [ ] 15 dias sem divergência relevante em agendamentos
- [ ] 2 ciclos de faturamento clientes conferidos
- [ ] 1 ciclo custos clínicas conferido
- [ ] Equipe treinada em login, agendamento e fatura
- [ ] Backup automático Supabase confirmado

---

## Contatos e suporte interno

| Papel | Responsabilidade |
|-------|------------------|
| Operacional | Agendamentos, e-Social, faturas do dia a dia |
| Admin | Clínicas, exames, cargos, usuários, migrations |
| Backup | Export CSV semanal no 1º mês |

---

## O que NÃO fazer no início

- Não rodar seeds em produção sem backup
- Não criar funcionalidades novas durante validação
- Não compartilhar link do sistema publicamente (apenas usuários Auth)
- Não usar LABORMESP genérica (deve estar inativa)
