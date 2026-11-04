-- Versão da proposta comercial.
-- Não altera proposta, contrato, cobertura nem parcela já gravados.
-- Proposta existente fica na versão 1. Proposta nova de mensalidade nasce na 2.
-- A aprovação copia a versão da proposta. Não promove renovação nem regravação antiga.
-- Não cria lista confirmada de abrangidos. A lista de funcionários continua em contrato_vagas.

alter table public.orcamentos
  add column if not exists proposta_modelo_versao smallint not null default 1;

alter table public.orcamentos
  drop constraint if exists orcamentos_proposta_modelo_versao_check;
alter table public.orcamentos
  add constraint orcamentos_proposta_modelo_versao_check
  check (proposta_modelo_versao in (1, 2));

comment on column public.orcamentos.proposta_modelo_versao is
  '1 = descrição comercial anterior. 2 = cobertura por tipo de exame. Default 1 nos orçamentos já existentes. Insert novo de mensalidade recebe 2.';

create or replace function public.trg_orcamento_proposta_modelo()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.modalidade = 'mensalidade' then
    new.proposta_modelo_versao := 2;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_orcamento_proposta_modelo on public.orcamentos;
create trigger trg_orcamento_proposta_modelo
  before insert on public.orcamentos
  for each row
  execute function public.trg_orcamento_proposta_modelo();

revoke all on function public.trg_orcamento_proposta_modelo() from public;
revoke all on function public.trg_orcamento_proposta_modelo() from anon;
grant execute on function public.trg_orcamento_proposta_modelo() to authenticated;
grant execute on function public.trg_orcamento_proposta_modelo() to service_role;

create or replace function public.trg_aprovacao_modelo_gestao_sst()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  modalidade text;
  versao_proposta smallint;
begin
  select o.modalidade, o.proposta_modelo_versao
    into modalidade, versao_proposta
  from public.orcamentos o
  where o.id = new.orcamento_id;

  if modalidade = 'mensalidade' then
    new.contrato_modelo_versao := case when versao_proposta = 2 then 2 else 1 end;
  end if;
  return new;
end;
$$;
