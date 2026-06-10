# Auditoria — histórico de ações críticas

O que o sistema **já registra** vs **lacunas** conhecidas (junho/2026).

---

## Com histórico dedicado

| Ação | Tabela / serviço | Observação |
|------|------------------|------------|
| Criar/editar agendamento | `agendamento_historico` | Via `historico.service.ts` |
| Cancelar agendamento | `agendamento_historico` | Status `cancelado` + motivo |
| Editar clínica | `clinicas_historico` | `clinica-historico.service.ts` |
| Vincular/editar exame da clínica | `clinica_exames_historico` | Custo, valor Navarro, ativação |
| Editar exame do catálogo | `exames_historico` | Admin / tela Exames |

---

## Sem tabela de histórico (apenas estado atual)

| Ação | Como fica registrado | Lacuna |
|------|----------------------|--------|
| Emitir fatura | Registro em `faturas` + `fatura_itens` | Sem log de quem emitiu (campo `gerado_por` se preenchido) |
| Cancelar fatura | `faturas.status = cancelada` | Sem histórico de cancelamento |
| Marcar pagamento | `pago`, `data_pagamento`, `observacao_pagamento` | Sem histórico de alterações de pagamento |
| Renovar contrato | Novo row `cliente_contratos` | Histórico implícito pelos registros |
| Encerrar contrato | Update em `cliente_contratos` | Sem tabela de auditoria |
| Editar cliente | Update direto em `clientes` | Sem histórico |
| e-Social enviado | Campos em `agendamentos` | Sem tabela de histórico e-Social |

---

## Política de dados (o que NÃO apaga)

| Entidade | Comportamento |
|----------|---------------|
| Agendamento | Cancelamento, não DELETE |
| Fatura | Status `cancelada`, não DELETE |
| Clínica | `status inativa` |
| Vínculo clínica-exame | `ativo false` |
| Cliente / contrato | Sem DELETE nas policies atuais |

---

## Melhorias futuras (não implementar agora)

1. `faturas_historico` — emissão, cancelamento, pagamento
2. `cliente_contratos_historico` — renovações e reajustes
3. `clientes_historico` — alterações cadastrais
4. RLS `anon` → `authenticated` em clínicas/exames
5. RLS em `agendamentos` documentada e restrita
