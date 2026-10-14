# Cofre

Dashboard pessoal e Segundo Cérebro em português: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase SSR, Cytoscape.js, Recharts e Lucide. Preparado para implantação na Vercel.

## Executar localmente

Requisito: Node.js 22.12+ (linha 22 LTS) e um projeto Supabase.

```bash
npm ci
cp .env.example .env.local
# Preencha as variáveis de ambiente descritas abaixo.
npm run dev
```

Abra http://localhost:3000. Sem credenciais, o login mostra instruções de configuração e não cria uma sessão fictícia.

1. No SQL Editor do Supabase, execute **uma vez** `supabase/schema.sql` em um projeto novo. Alternativamente, vincule o projeto com a CLI do Supabase e execute `supabase db push`; a migração equivalente está em `supabase/migrations/202610130001_initial.sql`. Não execute as duas alternativas no mesmo banco.
2. Preencha `.env.local` usando `.env.example` e reinicie o servidor.
3. Em **Authentication → URL Configuration**, configure Site URL como `http://localhost:3000` e permita `http://localhost:3000/auth/callback`.
4. Habilite Email/Password. Com confirmação de e-mail, o callback PKCE funciona no navegador que iniciou o cadastro. Para confirmação em outro dispositivo, configure o template **Confirm signup** com `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`.
5. Opcional: habilite Google em Authentication → Providers e adicione o Client ID/Secret do Google. No Google Cloud, a URI de callback é `https://SEU-PROJETO.supabase.co/auth/v1/callback` (a URI exata aparece no Supabase).
6. Crie sua conta. O trigger de cadastro cria o perfil automaticamente.

## Variáveis e Vercel

O arquivo `vercel.json` fixa o preset Next.js e os comandos de instalação e build.
O workflow `.github/workflows/ci.yml` verifica TypeScript, testes e build em pushes
para `main` e pull requests, sem precisar de credenciais de produção.

| Variável                        | Uso                                                                                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`      | URL pública do projeto Supabase.                                                                                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Chave pública `anon` ou publishable. A proteção dos dados está no RLS. Nunca use uma chave service_role/secret aqui. |
| `NEXT_PUBLIC_SITE_URL`          | Origem canônica, sem barra final: `http://localhost:3000` ou `https://seu-cofre.vercel.app`.                         |
| `NEWS_API_KEY`                  | Opcional, somente no servidor. Habilita `/api/news`.                                                                 |

Importe o repositório na Vercel, selecione o preset **Next.js** e Node.js 22.x. Configure as variáveis acima em Production e, se necessário, Preview. O comando de build é `npm run build`; o diretório de saída usa o padrão do preset. Variáveis `NEXT_PUBLIC_*` são incorporadas no build, portanto alterações exigem novo deploy.

Depois de conhecer o domínio definitivo, atualize `NEXT_PUBLIC_SITE_URL`, Site URL e a allowlist de redirects do Supabase (`https://seu-cofre.vercel.app/auth/callback`). Para ambientes Preview, use a origem do preview correspondente, com redirects permitidos, preferencialmente um projeto Supabase separado. O repositório não inclui credenciais e não executa deploy ou migrações remotas automaticamente.

A NewsAPI usa manchetes internacionais (EUA), nas categorias Geral, Tech, Economia e Ciência, e cache de 15 minutos no servidor. O plano gratuito é voltado ao desenvolvimento; verifique um plano que permita produção. Sem chave ou com falha do provedor, a interface informa a indisponibilidade sem bloquear os demais módulos. Fontes podem publicar em inglês.

## Estrutura

```text
app/
  (auth)/login/page.tsx         # Login, cadastro e Google OAuth
  (dashboard)/
    layout.tsx                 # Sessão validada, dados, sidebar e timer persistente
    page.tsx                   # KPIs, tarefas, projetos, finanças, foco e notícias
    tasks/page.tsx
    finances/page.tsx
    studies/page.tsx
    projects/page.tsx
    news/page.tsx
    notes/page.tsx             # Markdown, grafo e backlinks
    loading.tsx
  api/news/route.ts            # Proxy autenticado para NewsAPI
  auth/callback/route.ts       # OAuth e confirmação PKCE
  auth/confirm/route.ts        # Confirmação por token de e-mail
  globals.css
  error.tsx
  layout.tsx
components/                    # Módulos, formulários e providers
lib/
  supabase/client.ts           # Cliente do navegador tipado
  supabase/server.ts           # Cliente SSR com cookies
  supabase/config.ts
  types.ts
  utils.ts
proxy.ts                       # Middleware de autenticação no Next.js 16
supabase/
  schema.sql
  migrations/202610130001_initial.sql
tests/                         # Testes de RLS, links, integridade e valores
```

O fuso de exibição e dos KPIs diários é `America/Sao_Paulo`, definido em `lib/utils.ts`, para manter servidor e navegador consistentes.

## Comportamento

- **Autenticação:** cookies SSR renovados pelo proxy, validação de identidade no servidor e isolamento no Postgres. Não existe service role no aplicativo. Rotas privadas redirecionam visitantes; API privada retorna 401.
- **Tarefas:** criar, filtrar, editar, concluir/reabrir e excluir; categoria, prioridade e prazo.
- **Finanças:** CRUD de receitas/despesas, datas, categorias, saldo e gráfico de despesas de todo o período. Os totais usam centavos inteiros e são atualizados após cada gravação.
- **Projetos:** CRUD, status e progresso editável, com salvamento explícito. Progresso de 100% marca o projeto como concluído.
- **Pomodoro:** foco de 25 min, pausa de 5 min, pausar/retomar/reiniciar, sessões e minutos do dia. Usa timestamps, mantém o timer na navegação e persiste o estado local por usuário. Ao reabrir a aplicação, uma sessão encerrada é salva com UUID idempotente. Pausas não contam como foco. Se o navegador está fechado, a sincronização ocorre ao reabrir; não há execução de timer no servidor. Use uma aba por vez para controlar o timer. Falhas exibem a opção de tentar salvar novamente.
- **Notas:** salvar manualmente, Markdown com GFM, categoria, tags, busca, preview, backlinks e grafo com clique/zoom/arraste. HTML bruto não é executado; imagens externas são mostradas como texto no preview para evitar requisições de rastreamento. Links externos abrem com `noopener noreferrer`.
- **Wikilinks:** `[[Título]]` ignora maiúsculas e espaços nas extremidades. Títulos são únicos por conta. Um trigger SQL sincroniza as conexões na mesma transação da nota; resolve também notas criadas depois da referência e remove conexões obsoletas. Autorreferências são ignoradas. Renomear não reescreve os textos que citavam o nome anterior: atualize os wikilinks para o novo título. O parser considera wikilinks também dentro de blocos de código. O grafo representa referências direcionadas e o painel de backlinks mostra as referências de entrada.
- **Privacidade:** RLS em todas as sete tabelas; FKs compostas impedem links entre notas de proprietários diferentes. Triggers de links respeitam as permissões do chamador. O trigger de criação de perfil tem `search_path` fixado.

A sincronização de links reconstrói as conexões da conta a cada mudança em notas; é adequada a um cofre pessoal. Os registros são buscados em páginas de 500 linhas e reunidos em memória para os totais. Mantenha o limite de retorno do PostgREST em pelo menos 500. Para coleções grandes, prefira agregações no servidor, paginação na interface e atualização incremental do grafo. Os dados são recarregados após as mutações nesta sessão; não há assinatura do Supabase Realtime para alterações em outros dispositivos.

## Validação

```bash
npm run typecheck
npm test
npm run build
```

Os testes executam a migração em Postgres embutido (PGlite), com papéis `authenticated` e `anon` e identidade simulada por `auth.uid()`. Cobrem isolamento entre duas contas, tentativas de atribuir dados a outra conta, FKs de links, criação de perfil, links futuros/repetidos, edição, renomeação, exclusão, restrições e idempotência do Pomodoro. Não substituem um teste de ponta a ponta do Auth hospedado: antes do deploy, valide cadastro/confirmação, Google, cookies e a NewsAPI com suas credenciais reais.

Referências oficiais: [Next.js Proxy](https://nextjs.org/docs/app/getting-started/proxy), [Supabase SSR](https://supabase.com/docs/guides/auth/server-side/creating-a-client), [Cytoscape.js](https://js.cytoscape.org/), [NewsAPI](https://newsapi.org/docs/endpoints/top-headlines).
