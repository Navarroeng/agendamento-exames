-- 140: PDF final do Laudo AET até 20 MB.
-- O bucket orcamentos-onboarding é compartilhado (lista, logo, contrato,
-- documentos da empresa e PDF do laudo). O teto do bucket sobe para 20 MB
-- para o PDF do AET ser aceito no Storage.
-- Lista, logo, contrato, documentos da empresa e anexos de PGR/PCMSO/LTCAT
-- continuam limitados a 10 MB na aplicação. Esta migration não altera
-- allowed_mime_types nem outros buckets.

update storage.buckets
set file_size_limit = 20971520
where id = 'orcamentos-onboarding'
  and (file_size_limit is null or file_size_limit < 20971520);
