# Deploy e ambientes — produção Navarro

Fluxo recomendado: **Cursor → GitHub → Vercel**.

---

## 1. Branches

| Branch | Uso |
|--------|-----|
| `main` | **Produção** — equipe Navarro usa diariamente |
| `dev` | **Testes** — validar alterações antes de merge |

### Fluxo seguro

```
1. Desenvolver no Cursor (branch dev)
2. npm run build          ← obrigatório
3. Testar localmente (npm run dev)
4. git push origin dev
5. Preview Vercel da branch dev (se configurado)
6. Merge dev → main via Pull Request
7. Vercel publica main automaticamente
```

**Nunca** fazer push direto em `main` sem build e teste.

---

## 2. Vercel — configuração

### Projeto

1. Conectar repositório GitHub à Vercel.
2. **Production Branch:** `main`
3. Framework: Next.js (detectado automaticamente)

### Variáveis de ambiente (Production)

Configurar em **Vercel → Project → Settings → Environment Variables**:

| Variável | Ambiente | Obrigatória |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Sim |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Sim |

**Nunca adicionar:**

- `SUPABASE_SERVICE_ROLE_KEY` (bypass total do RLS)
- Conteúdo de `.env.local` com segredos extras

### Preview deployments

- Cada PR pode gerar URL de preview.
- Use **mesmo Supabase de staging** ou projeto clone — **não** aponte preview para produção se testes criam dados fictícios.

---

## 3. Comando obrigatório antes de publicar

```bash
npm run build
```

Deve terminar com **exit code 0**, sem erros de TypeScript ou ESLint.

Se falhar com erro de `.next/types`:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force .next
npm run build
```

---

## 4. Checklist de cada deploy

- [ ] `npm run build` passou localmente
- [ ] Alterações testadas na branch `dev`
- [ ] Migrations Supabase aplicadas **antes** ou **junto** do deploy (se houver)
- [ ] Backup CSV se migration altera dados (`BACKUP_PRODUCAO.md`)
- [ ] PR revisado (mesmo que auto-merge)
- [ ] Após deploy: smoke test em produção (login + 1 agendamento leitura)

---

## 5. Supabase — ambientes

| Ambiente | Recomendação |
|----------|--------------|
| Produção | 1 projeto Supabase dedicado |
| Testes | Projeto clone ou segundo projeto Free |

Não misturar testes destrutivos (seeds, deletes) no projeto de produção.

---

## 6. Cursor → GitHub

1. Commit com mensagem clara do **porquê**.
2. Push para `dev`.
3. Abrir PR para `main` no GitHub.
4. Aguardar build Vercel (se CI configurado).
5. Merge quando aprovado.

Arquivos que **nunca** vão para o Git:

- `.env.local` (já no `.gitignore`)
- CSVs de backup
- Chaves service_role

---

## 7. Rollback

### App (Vercel)

- **Deployments** → deployment anterior → **Promote to Production**

### Banco (Supabase)

- Restore de backup (painel) ou migration reversa manual
- CSV de backup para correções pontuais

---

## 8. Domínio e HTTPS

- Vercel fornece HTTPS automático.
- Configurar domínio customizado (ex.: `sistema.navarro.com.br`) quando disponível.
- Supabase URL permanece a do projeto (não muda com domínio Vercel).
