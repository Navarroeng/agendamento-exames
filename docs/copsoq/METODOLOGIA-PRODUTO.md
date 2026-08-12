# Metodologia de classificação do produto

**Decisão de produto** (adotada pelo sistema de Riscos Psicossociais).

Esta metodologia **substitui**, no motor e nos relatórios gerados/regenerados, os cortes e rótulos das Orientações COPSOQ II-Br (2,33 / 3,66 · Risco Intermediário / Risco para a Saúde).

O instrumento (perguntas, escalas, inversões, dimensões RISCO/PROTEÇÃO e normalização 0–4) permanece o COPSOQ II-Br documentado em `FORMULARIO-OFICIAL.md` e `ORIENTACOES-OFICIAIS.md`.

---

## Escala de classificação

Após o cálculo da média bruta e da **normalização para escala comum 0–4**, aplica-se:

### Dimensões de PROTEÇÃO (quanto maior, melhor)

| Classificação | Pontuação (0–4) | Cor | Interpretação |
|---------------|-----------------|-----|----------------|
| Situação Favorável | **> 2,66** | Verde | Baixa ou inexistente exposição a fatores de risco. |
| Situação Moderada | **1,34 a 2,66** | Amarelo | Exposição a fator(es) de risco com necessidade de monitoramento. |
| Situação Desfavorável | **0 a 1,33** | Vermelho | Exposição significativa a fator(es) de risco, requerendo intervenção. |

### Dimensões de RISCO (quanto maior, pior)

| Classificação | Pontuação (0–4) | Cor | Interpretação |
|---------------|-----------------|-----|----------------|
| Situação Favorável | **0 a 1,33** | Verde | Baixa ou inexistente exposição a fatores de risco. |
| Situação Moderada | **1,34 a 2,66** | Amarelo | Exposição a fator(es) de risco com necessidade de monitoramento. |
| Situação Desfavorável | **> 2,66** | Vermelho | Exposição significativa a fator(es) de risco, requerendo intervenção. |

---

## Fluxo (inalterado até a classificação)

1. Resposta do colaborador  
2. Pontuação da alternativa (Formulário)  
3. **Inversão da pergunta**, se `pontuacaoInvertida` (ex.: 1B) — **antes** da média  
4. Média bruta da dimensão  
5. Normalização para escala comum **0–4** (quando a amplitude impressa for outra, ex. 0–3)  
6. Identificação do tipo: `RISCO` ou `PROTECAO`  
7. Aplicação das faixas **1,33 / 2,66**  
8. Classificação + cor finais  

**Não confundir:** inversão de **pergunta** ≠ interpretação invertida de **dimensão** PROTEÇÃO.

---

## IDs internos (snapshot / código)

Para compatibilidade de filtros e snapshots:

| ID persistido | Rótulo exibido |
|---------------|----------------|
| `situacao_favoravel` | Situação Favorável |
| `risco_intermediario` | Situação Moderada |
| `risco_para_saude` | Situação Desfavorável |

---

## Snapshots antigos

Relatórios já gerados **não** são recalculados automaticamente.  
Para aplicar esta metodologia: **Regenerar Relatório**.

---

## Implementação

- Função central: `classificarMediaDimensao` em `lib/copsoq-engine/classification.ts`
- Cortes: `COPSOQ_FAIXA_BAIXA_MAX = 1.33`, `COPSOQ_FAIXA_MEDIA_MIN = 1.34`, `COPSOQ_FAIXA_MEDIA_MAX = 2.66`
