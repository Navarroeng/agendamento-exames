# Metodologia de classificação adotada pelo sistema

**Esta é a metodologia interna do produto** (Riscos Psicossociais).  
**Não** apresentar estes cortes como regra oficial do COPSOQ II-Br.

O instrumento (perguntas, alternativas, pontuações impressas, inversões e tipos RISCO/PROTEÇÃO) permanece o COPSOQ II-Br documentado em `FORMULARIO-OFICIAL.md` e `ORIENTACOES-OFICIAIS.md`.

---

## Auditoria das escalas impressas (Formulário)

| Alternativas | Escala impressa atual | Escala final do produto |
|--------------|----------------------|-------------------------|
| **5** (frequência, intensidade, saúde, exposição) | **0–4** | **0–5** (conversão linear) |
| **4** (satisfação, impacto vida particular) | **0–3** | **0–4** (conversão linear) |

Não assumir que 5 alternativas = pontuação 1–5. No Formulário, 5 alternativas estão em **0–4**.

---

## Conversão linear

Após pontuação da alternativa e **inversão da pergunta** (se houver):

```
valor_final = (valor − min_original) / (max_original − min_original) × max_destino
```

Exemplos:

- Original 0–4 → destino 0–5: `0→0`, `1→1,25`, `2→2,50`, `3→3,75`, `4→5`
- Original 0–3 → destino 0–4: `0→0`, `1→≈1,333`, `2→≈2,667`, `3→4`

---

## Fluxo

1. Resposta  
2. Pontuação impressa da alternativa  
3. Inversão da **pergunta** (`pontuacaoInvertida`), se prevista  
4. Conversão para escala final da pergunta (0–5 ou 0–4)  
5. Média aritmética das perguntas válidas da dimensão  
6. Tipo RISCO ou PROTEÇÃO  
7. Faixas da escala final da dimensão  
8. Classificação + cor  

**Não confundir** inversão de pergunta com interpretação invertida de dimensão PROTEÇÃO.

---

## Faixas — escala final 0–5 (5 alternativas)

### PROTEÇÃO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 3,50 – 5,00 | Verde |
| Situação Moderada | 2,00 – 3,49 | Amarelo |
| Situação Desfavorável | 0,00 – 1,99 | Vermelho |

### RISCO
| Classificação | Intervalo | Cor |
|---------------|-----------|-----|
| Situação Favorável | 0,00 – 1,99 | Verde |
| Situação Moderada | 2,00 – 3,49 | Amarelo |
| Situação Desfavorável | 3,50 – 5,00 | Vermelho |

---

## Faixas — escala final 0–4 (4 alternativas)

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

## Dimensões por escala final

### Escala 0–5
Demandas; Influência e desenvolvimento; Significado e comprometimento; Relações interpessoais; Liderança; Valores; Saúde Geral; Burnout e Estresse.

### Escala 0–4
Interface trabalho-indivíduo; Conflitos família e trabalho.

### Dimensões mistas
**Nenhuma** dimensão quantitativa mistura perguntas 4-alt e 5-alt.

### Pergunta invertida
**1B** (Demandas) — única com `pontuacaoInvertida: true`.

---

## Exibição no relatório

- Pontuação técnica: `X,XX / 4` ou `X,XX / 5` conforme a escala da dimensão.  
- Barras/radar: favorabilidade relativa (0–1) para comparação visual.  
- Tooltip: pontuação técnica real.

---

## Snapshots

Relatórios antigos não são recalculados. Use **Regenerar Relatório**.

---

## Implementação

- `lib/copsoq-engine/escala-produto.ts` — conversão e escala final  
- `lib/copsoq-engine/classification.ts` — faixas 0–4 / 0–5  
- `lib/copsoq-engine/statistics.ts` / `interpreter.ts` — médias bruta e final  
