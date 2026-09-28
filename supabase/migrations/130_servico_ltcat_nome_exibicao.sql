-- 130: o cadastro continua "LTCAT". A proposta exibe o nome completo.
-- A identificação aceita os dois textos, para orçamentos já gravados
-- e para um item que venha com o nome completo.

create or replace function public.is_servico_ltcat_nome(p_nome text)
returns boolean
language sql
immutable
as $$
  select public.normalize_servico_nome(p_nome) in (
    'ltcat',
    'ltcat - laudo tecnico das condicoes ambientais do trabalho'
  );
$$;
