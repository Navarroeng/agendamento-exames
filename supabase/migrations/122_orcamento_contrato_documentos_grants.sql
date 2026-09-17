-- 121 criou orcamento_contrato_documentos + RLS staff, sem GRANT explícito.
-- Sem privilégio para authenticated, o SELECT da prévia (próxima versão)
-- falha com permission denied e a UI mascara como "Não foi possível gerar a prévia."
-- Idempotente: reexecutar o GRANT não altera a regra RLS nem o modelo do contrato.

grant select, insert on table public.orcamento_contrato_documentos to authenticated;
grant select, insert on table public.orcamento_contrato_documentos to service_role;
