# Checklist de testes antes do uso oficial

Marque ✅ após validar em ambiente de **teste** ou produção controlada.  
Responsável: _______________  Data: _______________

---

## Pré-requisitos

- [ ] Migrations 001–014 aplicadas no Supabase
- [ ] Seed `005_exames_seed.sql` ou unidades LABORMESP (`014`) aplicados
- [ ] Usuários criados no Auth + `perfis_usuarios`
- [ ] `npm run build` sem erros
- [ ] Backup CSV realizado (`BACKUP_PRODUCAO.md`)

---

## 1. Autenticação e usuários

- [ ] Login com usuário operacional
- [ ] Login com usuário admin
- [ ] Logout limpa sessão (não acessa `/` sem login)
- [ ] Operacional **não** acessa `/exames`, `/cargos`, `/usuarios`
- [ ] Admin acessa todas as rotas do menu

---

## 2. Clientes

- [ ] Criar cliente (nome + CNPJ)
- [ ] Abrir modal do cliente
- [ ] Criar contrato ativo (datas vigentes)
- [ ] Renovar contrato (novo registro, anterior encerrado/em renovação)
- [ ] Cliente sem contrato vigente aparece como bloqueado no agendamento

---

## 3. Agendamentos

- [ ] Criar agendamento completo (cliente com contrato vigente)
- [ ] Selecionar clínica e exame — preços carregam automaticamente
- [ ] Editar agendamento sem duplicar linhas de exame
- [ ] Bloqueio: tentar agendar cliente sem contrato vigente
- [ ] Bloqueio: exame duplicado no mesmo agendamento
- [ ] Bloqueio: agendamento duplicado no mesmo mês (modal)
- [ ] Gerar mensagem WhatsApp para clínica
- [ ] Cancelar agendamento com motivo — status `cancelado`, histórico registrado

---

## 4. Clínicas e preços

- [ ] Listar clínicas ativas
- [ ] **LABORMESP JABAQUARA** e **LABORMESP IPIRANGA** aparecem no select (genérica inativa)
- [ ] Editar **custo clínica** de um exame vinculado
- [ ] Editar **valor Navarro** de um exame vinculado
- [ ] Lucro estimado recalcula ao editar
- [ ] Histórico registra alteração de custo e valor Navarro
- [ ] Agendamento puxa valor Navarro **atualizado** da unidade

### RX LABORMESP (valores esperados)

| Unidade | Exame | Custo | Valor cliente |
|---------|-------|-------|---------------|
| JABAQUARA | RX Tórax - PA | R$ 90,00 | R$ 105,00 |
| JABAQUARA | RX Tórax - PA + PERFIL | R$ 50,00 | R$ 77,00 |
| IPIRANGA | RX Tórax - PA | R$ 48,90 | R$ 77,00 |
| IPIRANGA | RX Tórax - PA + PERFIL | R$ 48,90 | R$ 77,00 |

- [ ] Jabaquara — RX PA conferido
- [ ] Ipiranga — RX PA conferido

---

## 5. Faturas Clientes

- [ ] Filtrar agendamentos elegíveis
- [ ] Pré-visualizar fatura
- [ ] Emitir fatura
- [ ] Gerar PDF — layout correto, valores corretos
- [ ] Bloqueio: fatura duplicada no mesmo mês (cliente)
- [ ] Marcar fatura como paga (data + observação)
- [ ] Voltar para pendente (se necessário)
- [ ] Cancelar fatura — status `cancelada`, dados preservados

---

## 6. Custos Clínicas

- [ ] Filtrar por clínica e período
- [ ] Pré-visualizar custos
- [ ] Emitir fatura tipo clínica
- [ ] Gerar PDF
- [ ] Sem exigir vencimento indevido
- [ ] Valores por clínica corretos (custo clínica dos exames)
- [ ] Bloqueio duplicidade mês (clínica)

---

## 7. e-Social

- [ ] Listar pendentes
- [ ] Filtrar por empresa / responsável
- [ ] Marcar como enviado
- [ ] Voltar para pendente
- [ ] Indicadores no Dashboard / Relatórios coerentes

---

## 8. Dashboard e Relatórios

- [ ] Dashboard carrega KPIs sem erro
- [ ] Relatórios carrega com filtros
- [ ] Exportação CSV/PDF em tabela de exames (Relatórios)

---

## 9. Estabilidade

- [ ] Navegação entre todas as páginas do menu sem erro
- [ ] Recarregar página (F5) mantém sessão
- [ ] Uso em tela menor (tablet) — layout utilizável

---

## Resultado

| | |
|---|---|
| **Aprovado para go-live?** | Sim / Não |
| **Observações** | |
| **Pendências** | |
