-- Status operacional intermediário: iniciado (pelo menos 1 resposta, ainda não concluído).

alter table public.riscos_campanha_participantes
  drop constraint if exists riscos_campanha_participantes_status_check;

alter table public.riscos_campanha_participantes
  add constraint riscos_campanha_participantes_status_check
  check (status in ('pendente', 'iniciado', 'respondido', 'invalidado', 'removido'));

comment on column public.riscos_campanha_participantes.status is
  'pendente | iniciado (1+ respostas) | respondido (concluído) | invalidado (legado) | removido';

-- Backfill: quem já tem resposta gravada e ainda está pendente → iniciado.
update public.riscos_campanha_participantes p
set status = 'iniciado'
where p.status = 'pendente'
  and p.concluiu_em is null
  and p.removido_em is null
  and exists (
    select 1
    from public.riscos_avaliacao_vinculos v
    join public.riscos_avaliacao_respostas r on r.sessao_id = v.sessao_id
    where v.participante_id = p.id
      and v.campanha_id = p.campanha_id
  );
