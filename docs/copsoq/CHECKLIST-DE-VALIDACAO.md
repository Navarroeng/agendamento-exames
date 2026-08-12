# Checklist de validação — COPSOQ II-Br

**Obrigatório** antes de qualquer alteração relacionada a COPSOQ / Pesquisa Psicossocial / Resultados / Dashboard / Relatórios / PDF / Estatísticas / Motor / Questionário / Dimensões / Classificações.

Fonte da verdade: arquivos em `docs/copsoq/` (derivados dos PDFs em `fonte-oficial/`).

---

## Procedimento

1. Ler `README.md`, `FORMULARIO-OFICIAL.md`, `ORIENTACOES-OFICIAIS.md` e `REGRAS-DE-CALCULO.md`.
2. Percorrer **todos** os itens abaixo.
3. Se **qualquer** item divergir da documentação oficial → **parar imediatamente** a implementação e informar a divergência (sem “corrigir por aproximação”).

---

## Checklist

### Instrumento (Formulário)

- [ ] perguntas
- [ ] ordem das perguntas
- [ ] textos
- [ ] alternativas
- [ ] escalas
- [ ] pontuações
- [ ] perguntas invertidas (especialmente **1B**)
- [ ] perguntas opcionais / fora do cálculo (Comportamentos ofensivos, conforme Orientações)
- [ ] textos intermediários oficiais (antes de 14A, 15A, 17 e definição de bullying antes de 23)
- [ ] ausência de interstícios inventados por dimensão

### Dimensões e interpretação (Orientações)

- [ ] dimensões
- [ ] classificação RISCO × PROTEÇÃO
- [ ] médias (individual e geral)
- [ ] normalização de amplitude → escala comum 0–4 antes dos cortes (dimensões 0–4 idênticas)
- [ ] limites / faixas do **produto** (1,33 e 2,66) — ver `METODOLOGIA-PRODUTO.md`
- [ ] exemplos de fronteira (1,33 / 1,34 / 2,66 / 2,67) para RISCO e PROTEÇÃO
- [ ] exemplo de média Demandas 2,43 → Situação Moderada (produto)
- [ ] questões de comportamento ofensivo (qualitativo; não entram no cálculo final)

### Motor e qualidade

- [ ] regras do motor (`REGRAS-DE-CALCULO.md`)
- [ ] pontos que retornam `null` propositalmente (risco geral, escore padronizado)
- [ ] nenhum preenchimento de lacuna oficial por aproximação
- [ ] testes automatizados relevantes executados e passando

---

## Critério de parada

| Situação | Ação |
|----------|------|
| Item alinhado à documentação | Prosseguir |
| Item diferente do Formulário ou das Orientações | **Parar** e reportar divergência |
| Regra ausente nos PDFs oficiais | **Não inventar**; documentar como indefinido / `null` |
| Nova versão oficial do COPSOQ | Substituir PDFs em `fonte-oficial/` e atualizar os `.md` antes de mudar código |

---

## Confirmação pós-implementação (quando a mudança for autorizada)

- [ ] `scripts/test-copsoq-formulario-oficial.ts`
- [ ] `scripts/test-copsoq-intersticiais.ts`
- [ ] `scripts/test-copsoq-engine.ts`
- [ ] `scripts/test-riscos-resultados.ts` (se resultados/consolidação)
- [ ] `npm run build`
