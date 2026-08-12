# Metodologia de classificação adotada pelo sistema

**Esta é a metodologia interna do produto** (Riscos Psicossociais).  
**Não** apresentar estes cortes como regra oficial do COPSOQ II-Br.

O questionário (perguntas, alternativas, pontuações impressas, inversões e tipos RISCO/PROTEÇÃO) permanece baseado no COPSOQ II-Br (`FORMULARIO-OFICIAL.md` / `ORIENTACOES-OFICIAIS.md`).

---

## Escalas impressas (sem conversão)

| Alternativas | Pontuações impressas | Escala da dimensão |
|--------------|----------------------|--------------------|
| **5** | **0–4** | **0–4** |
| **4** | **0–3** | **0–3** |

Não há conversão obrigatória de 0–3 → 0–4 nem de 0–4 → 0–5 para classificação.

---

## Fluxo

1. Resposta  
2. Pontuação impressa da alternativa  
3. Inversão da **pergunta** (`pontuacaoInvertida`), se prevista  
4. Média aritmética das perguntas válidas da dimensão  
5. Identificação da escala da dimensão (0–4 ou 0–3)  
6. Tipo RISCO ou PROTEÇÃO  
7. Faixas correspondentes  
8. Classificação + cor  

**Não confundir** inversão de pergunta com interpretação invertida de dimensão PROTEÇÃO.

Denominador da média = quantidade de perguntas válidas (não o máximo da escala).

---

## Faixas — escala 0–4 (cortes 1,60 / 2,80)

### PROTEÇÃO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 2,80 – 4,00 | Verde |
| Situação Moderada | 1,60 – 2,79 | Amarelo |
| Situação Desfavorável | 0,00 – 1,59 | Vermelho |

### RISCO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 0,00 – 1,59 | Verde |
| Situação Moderada | 1,60 – 2,79 | Amarelo |
| Situação Desfavorável | 2,80 – 4,00 | Vermelho |

---

## Faixas — escala 0–3 (cortes 1,20 / 2,10)

### PROTEÇÃO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 2,10 – 3,00 | Verde |
| Situação Moderada | 1,20 – 2,09 | Amarelo |
| Situação Desfavorável | 0,00 – 1,19 | Vermelho |

### RISCO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 0,00 – 1,19 | Verde |
| Situação Moderada | 1,20 – 2,09 | Amarelo |
| Situação Desfavorável | 2,10 – 3,00 | Vermelho |

---

## Dimensões por escala

### 0–4
Demandas; Influência e desenvolvimento; Significado e comprometimento; Relações interpessoais; Liderança; Valores; Saúde Geral; Burnout e Estresse.

### 0–3
Interface trabalho-indivíduo; Conflitos família e trabalho.

### Mistas
Nenhuma dimensão quantitativa mistura 0–3 e 0–4.

### Invertida
**1B** (Demandas) — única com `pontuacaoInvertida: true`.

### Fora do cálculo
Comportamentos ofensivos — análise qualitativa.

---

## Exibição

- Pontuação: `X,XX / 3` ou `X,XX / 4` conforme a escala da dimensão.  
- Barras/radar: favorabilidade relativa; tooltip com pontuação técnica.

---

## Snapshots

Relatórios antigos não são recalculados. Use **Regenerar Relatório**.

---

## Implementação

- `lib/copsoq-engine/escala-produto.ts` — detecta escala 0–3 / 0–4  
- `lib/copsoq-engine/classification.ts` — `FAIXA_ESCALA_4` / `FAIXA_ESCALA_3`  
- `lib/copsoq-engine/statistics.ts` / `interpreter.ts` — média impressa (pós-inversão)
