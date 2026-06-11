# Seeds Supabase

## Ordem de execução (SQL Editor)

1. `migrations/003_clinicas.sql`
2. `migrations/004_exames_catalog.sql`
3. `migrations/005_clinica_exames_valor_navarro.sql` (se `clinica_exames` já existir sem a coluna)
4. `seeds/005_exames_seed.sql` — catálogo e custos da matriz `tabela-exames.csv`
5. `migrations/014_labormesp_unidades.sql` — unidades LABORMESP (bases já populadas)
6. `migrations/021_previne_unidades.sql` — unidades **PREVINE SANTANA** e **PREVINE SANTO ANDRÉ** (copia exames da PREVINE original)
7. `migrations/024_spix_pinheiros.sql` — unidade **SPIX PINHEIROS** (copia exames da SPIX original)

## Regenerar o seed

Fonte local (raiz do projeto):

`tabela-exames.csv`

Colunas: `EXAMES` (exame + clínica), `CUSTOS` (custo clínica), `NAVARRO` (valor de venda).

```bash
npm run seed:exames
# ou
node scripts/generate-exames-seed.mjs
```

## O que o seed faz

- Cria as clínicas: AL ASSESSORIA, SPIX, PRIME, PREZERVARE, PREVINE, **PREVINE SANTANA**, **PREVINE SANTO ANDRÉ**, BC WORK, ENGSEGTRA, **LABORMESP JABAQUARA**, **LABORMESP IPIRANGA** (se não existirem)
- **LABORMESP** no CSV é expandida para as duas unidades; RX com preços distintos por unidade (ver `UNIT_PRICE_OVERRIDES` em `scripts/generate-exames-seed.mjs`)
- **PREVINE** no CSV é expandida para PREVINE, PREVINE SANTANA e PREVINE SANTO ANDRÉ (mesmos valores); em bases já populadas use `migrations/021_previne_unidades.sql`
- A LABORMESP genérica (se existir no banco) deve ficar **inativa** — use `migrations/014_labormesp_unidades.sql` em bases já populadas
- **AL ASSESSORIA**: cadastrada no seed com vínculo apenas em **Clínico** (valores 0; preço manual no agendamento)
- Faz upsert em `exames` (`valor_navarro` = **menor** NAVARRO da matriz, referência do catálogo)
- Recria vínculos em `clinica_exames` (`custo_clinica` = CUSTOS, `valor_navarro` = NAVARRO por clínica — usado no agendamento)
- Ignora valores `-` ou vazios
- Separa exame e clínica a partir da coluna EXAMES (ex.: `Audiometria SPIX`)
