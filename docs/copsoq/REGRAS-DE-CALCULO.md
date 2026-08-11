# Regras de cálculo — motor COPSOQ do projeto

Documentação técnica do motor implementado em `lib/copsoq-engine/`.  
Complementa (não substitui) `FORMULARIO-OFICIAL.md` e `ORIENTACOES-OFICIAIS.md`.

---

## Arquitetura

```
Respostas (alternativaId por pergunta)
        │
        ▼
lib/copsoq/          → instrumento (perguntas, escalas, dimensões)
        │
        ▼
lib/copsoq-engine/   → pontuação → médias → classificação → saída agregada
        │
        ▼
lib/riscos-resultados.ts / services/riscos-resultados.service.ts
        → consolidação anônima por campanha (sessões válidas)
```

### Arquivos do motor

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/copsoq-engine/index.ts` | API pública do motor |
| `lib/copsoq-engine/types.ts` | Tipos + `COPSOQ_ENGINE_DIVERGENCIAS` |
| `lib/copsoq-engine/score.ts` | Pontuação efetiva (inclui inversão configurável) |
| `lib/copsoq-engine/normalization.ts` | Normalização de chave de alternativa |
| `lib/copsoq-engine/dimensions.ts` | Média individual e média geral por dimensão |
| `lib/copsoq-engine/classification.ts` | Faixas 2,33 / 3,66 RISCO e PROTEÇÃO |
| `lib/copsoq-engine/statistics.ts` | Cobertura e participação operacional |
| `lib/copsoq-engine/interpreter.ts` | Orquestra campanha → resultado |

### Instrumento (não é o motor, mas alimenta o motor)

| Arquivo | Responsabilidade |
|---------|------------------|
| `lib/copsoq/perguntas.ts` | 40 perguntas / códigos / inversão |
| `lib/copsoq/escalas.ts` | Alternativas e pontuações impressas |
| `lib/copsoq/dimensoes.ts` | Dimensões RISCO/PROTEÇÃO e `entraNoCalculo` |
| `lib/copsoq/instrument.ts` | Fluxo e agregação do instrumento |
| `lib/copsoq/intersticiais.ts` | Textos intermediários oficiais do Formulário |

---

## Fluxo completo de processamento

1. Carregar respondentes (cada um: mapa `perguntaId → alternativaId`).
2. Para cada dimensão com `entraNoCalculo === true`:
   - Selecionar perguntas da dimensão que entram no cálculo.
   - Pontuar cada resposta (`pontuarAlternativa` / por id).
   - Se `pontuacaoInvertida` (ex.: 1B): pontuação efetiva = `maxEscala − pontuação impressa da alternativa na escala base`.
   - **Média individual** = soma das pontuações ÷ número de perguntas da dimensão (só se o conjunto estiver completo para aquele respondente, conforme regras de cobertura do código).
   - **Média geral** = média das médias individuais válidas.
   - **Classificar** a média geral conforme tipo RISCO ou PROTEÇÃO.
3. Dimensão **Comportamentos ofensivos**:
   - Não entra no cálculo quantitativo (`entraNoCalculo: false`).
   - Saída apenas qualitativa (frequências), sem média/classificação quantitativa.
4. `riscoGeral` e `escorePadronizado` permanecem **null**.
5. `participacao` é métrica **operacional do sistema** (respondentes / base), não uma regra COPSOQ dos PDFs.

Entrada tipica da campanha: `interpretarCampanhaCopsoq({ respondentes, baseParticipacao })`.

---

## Regras vindas diretamente dos documentos oficiais

| Regra | Origem |
|-------|--------|
| Textos, códigos, ordem e alternativas das 40 perguntas | Formulário |
| Pontuações impressas 0–4 / 0–3 | Formulário |
| 1B com pontuações impressas invertidas | Formulário (+ exemplo Orientações “Raramente (invertido)”) |
| Agrupamento por dimensão e tipo RISCO/PROTEÇÃO | Orientações |
| Comportamentos ofensivos fora do cálculo final; análise qualitativa | Orientações |
| Média individual = soma ÷ nº de perguntas da dimensão | Orientações |
| Média geral = média das médias individuais | Orientações |
| Exemplo Demandas: média individual 2,5; geral 2,43 → Risco Intermediário | Orientações |
| Cortes 2,33 e 3,66; faixas favorável / intermediário / risco para a saúde | Orientações |
| PROTEÇÃO: faixas invertidas em relação a RISCO | Orientações |
| Análise separada por fator (não um único índice) | Orientações |
| Anonimato / voluntariedade | Formulário + Orientações |

---

## Regras indefinidas nos PDFs oficiais (não implementar por aproximação)

| Tema | Status no motor |
|------|-----------------|
| Conversão 0–4 (Formulário) ↔ 1–5 / “Intervalo (0 a 5)” (Orientações) | **Não convertida**. Usam-se pontuações do Formulário + cortes 2,33/3,66. |
| Risco geral agregado entre dimensões | **null** (`riscoGeral`) |
| Escore padronizado | **null** (`escorePadronizado`) |
| Fórmula oficial única de “pontuação geral” além das médias por dimensão | Não definida; ofensivos explicitamente fora |
| Renormalização para escala 0–5 | Proibida sem nova documentação oficial |

Documentadas também em `COPSOQ_ENGINE_DIVERGENCIAS` (`lib/copsoq-engine/types.ts`).

---

## O que retorna null propositalmente

- `riscoGeral`
- `escorePadronizado` (por dimensão e agregado)
- `media` / classificação quantitativa de **Comportamentos ofensivos**
- Classificação quando média indisponível → `classificacao_nao_definida` (não inventar faixa)

---

## Pontos que jamais devem ser implementados por aproximação

1. Inventar “risco geral” ou ranking único entre dimensões.
2. Converter escala 0–4 → 1–5 (ou o inverso) sem texto oficial que defina a conversão.
3. Incluir Comportamentos ofensivos na média/classificação quantitativa.
4. Alterar textos, alternativas ou pontuações do Formulário para “combinar” com trechos 1–5 das Orientações.
5. Criar interstícios de dimensão que não existem no Formulário (ver `lib/copsoq/intersticiais.ts`).
6. Expor respostas individuais nominais em dashboards/resultados.

---

## Participação operacional (sistema)

`calcularParticipacaoOperacional` / consolidação em `lib/riscos-resultados.ts` usam base operacional da campanha (ex.: quantidade prevista / sessões válidas).  
Isso **não** é regra de cálculo COPSOQ dos PDFs; é indicador de produto.

---

## Testes de referência do motor

- `scripts/test-copsoq-engine.ts`
- `scripts/test-riscos-resultados.ts`
- `scripts/test-copsoq-formulario-oficial.ts` (40/40 vs fixture)
- `scripts/test-copsoq-intersticiais.ts`
- `scripts/test-riscos-invalidacao.ts` (sessões válidas nos resultados)

Antes de mudar o motor: executar estes testes e o `CHECKLIST-DE-VALIDACAO.md`.
