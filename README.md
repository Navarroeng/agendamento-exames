# Agendamento de Exames — Navarro Engenharia

Sistema de agendamento de exames ocupacionais em **Next.js 14** (App Router), **Tailwind CSS** e **Supabase**.

## Começar

1. Copie as variáveis de ambiente:

```bash
cp .env.local.example .env.local
```

2. Preencha `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` no `.env.local`.

3. Instale e rode:

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Estrutura

- `app/` — layout, página principal e estilos globais
- `components/` — UI por domínio (layout, agendamentos, clientes, clínicas, exames)
- `hooks/` — formulário e exames dinâmicos
- `lib/` — Supabase client, tipos, utilitários
- `services/` — persistência no Supabase

## Supabase

Tabelas esperadas: `agendamentos`, `agendamento_exames`, `agendamento_historico`.

Execute no SQL Editor do Supabase os arquivos em `supabase/migrations/`:
- `001_agendamento_historico.sql` — tabela de histórico e policies RLS
- `002_motivo_cancelamento.sql` — coluna `motivo_cancelamento` em `agendamentos`
