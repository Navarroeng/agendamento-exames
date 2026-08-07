-- Riscos Psicossociais: entrada simultânea com Laudos SST (pós-Implantação).
-- A aba "Laudos SST" em Riscos é automática e deriva do status real de
-- orcamento_laudos_sst — não há coluna espelhada para evitar divergência.

comment on table public.orcamento_riscos_psicossociais is
  'Progresso das etapas manuais de Riscos Psicossociais (6). Entrada na conclusão da Implantação, junto com Laudos SST. A 1ª aba UI "Laudos SST" é automática e lê orcamento_laudos_sst.';

comment on column public.orcamento_riscos_psicossociais.entrada_em is
  'Momento de entrada em Riscos Psicossociais (= conclusão da Implantação / mesma janela de entrada em Laudos SST). Não altera quando Laudos é concluído.';

comment on column public.orcamento_riscos_psicossociais.etapas_concluidas is
  'Etapas manuais concluídas (0–6). O progresso UI soma +1 quando Laudos SST estiver concluído (total 7).';

-- Alinha entrada_em histórica à entrada de Laudos (não à conclusão de Laudos).
update public.orcamento_riscos_psicossociais r
set entrada_em = l.entrada_em
from public.orcamento_laudos_sst l
where r.orcamento_id = l.orcamento_id
  and l.entrada_em is not null
  and (
    r.entrada_em is distinct from l.entrada_em
  );
