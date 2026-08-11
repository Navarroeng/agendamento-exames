# Documentação oficial permanente — COPSOQ II-Br

Esta pasta é a **fonte oficial** do COPSOQ II-Br utilizada por este projeto.

## O que estes arquivos representam

- Documentação **permanente** do instrumento COPSOQ II-Br adotado pelo sistema.
- Extraída **exclusivamente** dos dois PDFs anexados na criação desta documentação:
  - `fonte-oficial/COPSOQ-II-Formulario-de-Aplicacao.pdf`
  - `fonte-oficial/COPSOQ-II-Orientacoes-v2.pdf`
- Textos extraídos dos mesmos PDFs (para consulta textual):
  - `fonte-oficial/COPSOQ-II-Formulario-de-Aplicacao.txt`
  - `fonte-oficial/COPSOQ-II-Orientacoes-v2.txt`

## Regra obrigatória para alterações futuras

Qualquer alteração relacionada a:

- COPSOQ;
- Pesquisa Psicossocial;
- Resultados;
- Dashboard;
- Relatórios;
- PDF;
- Estatísticas;
- Motor de cálculo;
- Questionário;
- Dimensões;
- Classificações;

deve **consultar primeiro** os arquivos desta pasta (`docs/copsoq/`), nesta ordem sugerida:

1. `README.md` (esta página)
2. `FORMULARIO-OFICIAL.md`
3. `ORIENTACOES-OFICIAIS.md`
4. `REGRAS-DE-CALCULO.md`
5. `CHECKLIST-DE-VALIDACAO.md`

## Fontes e atualização

- Os PDFs em `fonte-oficial/` são a **única** base utilizada para gerar esta documentação.
- **Somente** uma futura atualização oficial do COPSOQ poderá substituir ou complementar estas informações.
- Em caso de nova versão oficial, substituir os PDFs em `fonte-oficial/` e atualizar os `.md` desta pasta de forma explícita (com registro da mudança).
- **Não** consultar novamente os PDFs em conversas futuras, salvo quando houver **nova versão oficial** do instrumento.

## Proibições para implementação / IA

- Não presumir regras diferentes das documentadas aqui.
- Não usar memória, conhecimento prévio ou versões alternativas do COPSOQ.
- Não “completar” lacunas oficiais por aproximação.
- Se algo não estiver documentado nos PDFs oficiais anexados, tratar como **indefinido** (ver `REGRAS-DE-CALCULO.md` e `ORIENTACOES-OFICIAIS.md`).

## Índice

| Arquivo | Conteúdo |
|---------|----------|
| [FORMULARIO-OFICIAL.md](./FORMULARIO-OFICIAL.md) | Instrumento completo (40 itens, escalas, textos intermediários) |
| [ORIENTACOES-OFICIAIS.md](./ORIENTACOES-OFICIAIS.md) | Dimensões, cálculo, faixas, exemplos e observações |
| [REGRAS-DE-CALCULO.md](./REGRAS-DE-CALCULO.md) | Documentação técnica do motor do projeto |
| [CHECKLIST-DE-VALIDACAO.md](./CHECKLIST-DE-VALIDACAO.md) | Checklist obrigatório antes de qualquer mudança |
| [fonte-oficial/](./fonte-oficial/) | PDFs e textos oficiais incorporados ao repositório |
