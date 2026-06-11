-- Preparo de exames (instruções para colaborador/clínica)
alter table public.exames
  add column if not exists preparo text null;

comment on column public.exames.preparo is
  'Instruções de preparo do exame; null ou vazio = sem preparo.';

-- Atualiza preparos dos exames existentes (somente coluna preparo)
update public.exames
set preparo = $$Estar em jejum de 8 horas.$$,
    updated_at = now()
where nome = 'Glicemia';

update public.exames
set preparo = $$Lavar bem os cabelos, preferencialmente com sabão de coco. Não usar gel, cremes ou qualquer outro produto nos cabelos após a lavagem.$$,
    updated_at = now()
where nome = 'EEG';

update public.exames
set preparo = $$Homens devem comparecer com o tórax previamente raspado.$$,
    updated_at = now()
where nome = 'ECG';

update public.exames
set preparo = $$Fazer repouso auditivo por 14 horas antes do exame. Evitar o uso de fones de ouvido nesse período.$$,
    updated_at = now()
where nome = 'Audiometria';

update public.exames
set preparo = $$Trazer os óculos de grau, caso faça uso.$$,
    updated_at = now()
where nome = 'Acuidade Visual';

update public.exames
set preparo = $$As amostras devem ser coletadas em casa e trazidas no dia do exame.

* Coletar em recipiente limpo e seco e transferir com a pazinha uma pequena porção das fezes para frasco específico;
* É de fundamental importância que se evite a contaminação com urina, água ou outro elemento;
* Se houver muco, pus ou sangue, colher esta porção;
* Não usar laxantes para forçar a coleta;
* Conservar em geladeira.$$,
    updated_at = now()
where nome = 'PPF';

update public.exames
set preparo = $$As amostras devem ser coletadas em casa e trazidas no dia do exame.

* Coletar em recipiente limpo e seco e transferir com a pazinha uma pequena porção das fezes para frasco específico;
* É de fundamental importância que se evite a contaminação com urina, água ou outro elemento;
* Se houver muco, pus ou sangue, colher esta porção;
* Não usar laxantes para forçar a coleta;
* Conservar em geladeira.$$,
    updated_at = now()
where nome = 'Coprocultura';

update public.exames
set preparo = $$* Faça jejum de 8 a 12 horas.
* Não tome café, chá, leite, suco ou qualquer alimento durante o jejum.
* Não beba álcool no dia anterior.
* Evite exercícios físicos intensos no dia anterior ao exame.
* Se usa medicamento, tome normalmente, a menos que seu médico tenha orientado diferente.$$,
    updated_at = now()
where nome = 'Hemograma completo';
