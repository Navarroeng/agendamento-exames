-- PDFs de mensalidade à vista gerados antes dos dados bancários
-- deixam de ser a versão vigente. O arquivo permanece no histórico.
-- Contrato assinado não é alterado nem marcado para substituição.

update public.orcamento_contrato_documentos d
set desatualizado_em = now()
from public.orcamento_aprovacoes a
where d.aprovacao_id = a.id
  and d.desatualizado_em is null
  and coalesce(a.contrato_assinado, false) = false
  and a.mensalidade_pagamento = 'avista';
