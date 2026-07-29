-- Encerramento de contrato a partir de orçamento aprovado.
-- Preserva data_inicio/data_fim (vigência prevista) e registra encerramento separado.

-- 1) Status de orçamento: contrato_encerrado
alter table public.orcamentos
  drop constraint if exists orcamentos_status_check;

alter table public.orcamentos
  add constraint orcamentos_status_check check (
    status in (
      'em_elaboracao',
      'enviado',
      'em_negociacao',
      'aprovado',
      'reprovado',
      'cancelado',
      'contrato_encerrado'
    )
  );

-- 2) Metadados de encerramento no contrato (sem sobrescrever data_fim prevista)
alter table public.cliente_contratos
  add column if not exists encerrado_em timestamptz null,
  add column if not exists encerrado_por text null,
  add column if not exists motivo_encerramento text null;

comment on column public.cliente_contratos.encerrado_em is
  'Data/hora em que o contrato foi encerrado manualmente (antes ou no fim da vigência).';

comment on column public.cliente_contratos.encerrado_por is
  'Usuário responsável pelo encerramento manual.';

comment on column public.cliente_contratos.motivo_encerramento is
  'Motivo informado no encerramento manual do contrato.';
