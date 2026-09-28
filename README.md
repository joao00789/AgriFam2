# AgriFam

Site da AgriFam, uma plataforma para aproximar consumidores da agricultura familiar.

> **Sobre os produtos/produtores exibidos hoje:** o catálogo atual vem do script de seed
> (`server/src/db/seed.ts`) e é só um exemplo visual/demonstrativo — não é o catálogo
> real da região. Produtores de verdade vão se cadastrar e preencher isso conforme a
> demanda local.

## Stack do frontend

- **HTML5**: estrutura semântica, acessibilidade básica e pontos de montagem do conteúdo.
- **CSS3**: layout, tokens visuais, responsividade, estados e animações.
- **JavaScript**: comportamento da página, integração com a API do backend e interações.
- **TypeScript**: contratos de dados e base para a migração gradual do JavaScript.
- **Swiper 11**: carrossel principal do hero.
- **DM Sans** e **Nunito Sans**: tipografia carregada pelo Google Fonts.

O navegador usa `script.js` diretamente. O `script.ts` ainda é uma base tipada separada e não é carregado pelo `index.html`.

## Recursos externos

Os recursos externos usados atualmente estão concentrados no `index.html` e nas URLs dos dados de `script.js`:

| Recurso | Local de uso | Origem |
| --- | --- | --- |
| DM Sans e Nunito Sans | Títulos, textos e controles | [Google Fonts](https://fonts.google.com/) carregado no `<head>` |
| Swiper 11 | Carrossel `.hero` | [jsDelivr](https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js) |
| Imagens de produtos e produtores | Cards do catálogo e produtores | [Unsplash](https://unsplash.com/) por URL em `script.js` |
| Shader do hero | Canvas `#heroShader` | Pacote `gradient-gl@2.0.5` via [unpkg](https://unpkg.com/gradient-gl@2.0.5) |
| Busca por voz | Botões `.voice-search` | API nativa `SpeechRecognition`/`webkitSpeechRecognition` do navegador |

As imagens externas dependem de conexão com a internet. Para produção, prefira baixar os arquivos aprovados e colocá-los em `asset/imagens/`.

## Assets locais

Os arquivos visuais ficam em `asset/`:

### Ícones PNG

| Arquivo | Uso no frontend |
| --- | --- |
| `asset/icons/lupa.png` | Ícone dos campos de busca desktop e mobile |
| `asset/icons/carrinho.png` | Botão do carrinho no cabeçalho |
| `asset/icons/menu hamburger open.png` | Menu mobile fechado |
| `asset/icons/menu hamburger close.png` | Menu mobile aberto |
| `asset/icons/seta esquerda.png` | Navegação anterior do carrossel |
| `asset/icons/seta direita.png` | Navegação seguinte do carrossel |

### Imagens locais

| Arquivo | Uso no frontend |
| --- | --- |
| `asset/imagens/logo 2.png` | Logo do cabeçalho e rodapé |
| `asset/imagens/fundo 1.jpg` | Primeiro slide do hero |
| `asset/imagens/fundo 2.jpg` | Segundo slide do hero |
| `asset/imagens/fundo 3.jpg` | Terceiro slide do hero |
| `asset/imagens/print.png` | Imagem auxiliar disponível no projeto |

### SVGs

Não há biblioteca de ícones instalada. Os demais ícones são SVGs inline:

- Ícones de navegação, favoritos, microfone, filtros, redes sociais e treinamento ficam diretamente no `index.html`.
- Ícones das categorias ficam no objeto `categoryIcons` de `script.js` e são inseridos na renderização da categoria.
- O mapa ilustrativo do Piauí também é um SVG inline em `index.html`.

Para adicionar um ícone pequeno de interface, prefira reutilizar um SVG inline existente. Para uma imagem que precisa ser trocada pela equipe, use `asset/icons/` e referencie o caminho com `src="asset/icons/nome-do-arquivo.png"`.

## Onde encontrar cada parte

### Estrutura da página: `index.html`

| Parte | Localizador principal | Responsabilidade |
| --- | --- | --- |
| Aviso superior | `.announcement` | Mensagem institucional no topo |
| Cabeçalho desktop/mobile | `#topo`, `.site-header` | Logo, busca, navegação e ações |
| Menu mobile | `#mobileMenu`, `#menuToggle` | Navegação responsiva |
| Hero/carrossel | `.hero`, `.hero-one`, `.hero-two`, `.hero-three` | Destaques principais |
| Categorias | `#categorias`, `#categoryList` | Categorias renderizadas pelo JavaScript |
| Produtos e filtros | `#produtos`, `#productGrid`, `#filters` | Catálogo, busca, ordenação e filtros |
| Como funciona | `#como-funciona` | Etapas de compra local |
| Produtores | `#produtores`, `#producerGrid` | Cards e perfis dos produtores |
| Educação | `#educacao`, `#capacitacao` | Conteúdo institucional e treinamentos |
| Localização | `.location-section`, `.piaui-map` | Mapa e indicadores da plataforma |
| CTA do produtor | `#seja-produtor` | Chamada para cadastro de produtores |
| Rodapé | `#sobre`, `.site-footer` | Links institucionais e redes sociais |
| Carrinho | `#cartDrawer`, `#cartItems` | Drawer do carrinho e total |
| Chat | `#chatDrawer`, `#chatMessages` | Conversas entre cliente e produtor |
| Modais | `#producerModal`, `#authModal`, `#trainingModal` | Perfis, login e capacitação |

### Comportamento: `script.js`

O frontend já busca dados reais do backend (`server/`, ver [API do backend](#api-do-backend)) via a função `api()` no topo do arquivo — não há mais arrays de produtos/produtores/categorias mockados.

| Bloco | O que editar |
| --- | --- |
| `api()` e `API_BASE` | Chamada HTTP central (cookies inclusos) e URL base do backend |
| `categoryIcons` | SVGs usados nos botões de categoria (só isso continua fixo no frontend) |
| `$` e `$$` | Atalhos para `querySelector` e `querySelectorAll` |
| `loadProducts()`, `renderProducts()`, `productCard()` | Busca (com filtros via query string), estrutura e conteúdo dos cards de produto |
| `loadProducers()`, `renderProducers()`, `producerCard()` | Grid de produtores e conteúdo do modal de perfil |
| `renderCart()`, `saveCart()`, `saveFavorites()` | Carrinho e favoritos — **continuam no `localStorage`** (funcionam sem login; só o checkout exige sessão) |
| `openAuthModal()`, `setAuthMode()`, `loadSession()` | Login, cadastro (com perfil de produtor) e sessão atual |
| `loadConversations()`, `selectConversation()`, `renderMessages()` | Chat: lista de conversas e histórico de mensagens |
| `openModal()` e `closeModals()` | Abertura e fechamento dos modais |

Os elementos são encontrados principalmente por `id`, por exemplo `$("#productGrid")`, por classe, por exemplo `$(".search-wrap input")`, e por atributos `data-*`, por exemplo `[data-cart]` e `[data-producer]`. Ao criar um novo componente interativo, adicione um seletor estável no HTML e conecte o evento no bloco correspondente do `script.js`.

## Integração com o backend

O frontend está **100% integrado** ao backend em `server/` (Fase 5 do [TODO.md](TODO.md), concluída). Não há mais dados mockados de catálogo, autenticação ou conversas — tudo isso vem de verdade da API.

### O que ainda é só do navegador (por design, não é mock temporário)

- **Carrinho** (`agrifam-cart`) e **favoritos** (`agrifam-favorites`) continuam no `localStorage`, disponíveis no botão do coração no cabeçalho (e no menu mobile). As listas são específicas deste navegador.
- Perfil pessoal, troca de senha com a senha atual, perfil da loja, catálogo e pedidos usam a API e o banco.

### O que rodar para desenvolver localmente

1. Na primeira execução, crie `server/.env` copiando `server/.env.example` e instale as dependências com `cd server && npm ci`.
2. Aplique as migrações com `npm run db:migrate` dentro de `server/`. Para preencher um banco de demonstração vazio, rode `npm run db:seed` (não use seed em banco com dados reais).
3. Inicie o backend em `server/` com `npm start` (ou `npm run dev`) e mantenha o terminal aberto. A API fica em `http://localhost:3333`.
4. Sirva a raiz do projeto por HTTP — não abra `index.html` como `file://`. Por exemplo, na raiz rode `python3 -m http.server 5173`; abra `http://localhost:5173`.
5. Para login Google, configure `SUPABASE_URL` e `SUPABASE_PUBLISHABLE_KEY` no `server/.env`. No Supabase, ative o provedor Google e informe o Client ID/Secret do Google. No Google Cloud, cadastre como URI de redirecionamento a URL de callback mostrada pelo Supabase em Authentication > Providers > Google. Em Authentication > URL Configuration, permita `http://localhost:5173/**` e `http://127.0.0.1:5173/**`. O botão de login usa OAuth com PKCE e o backend valida o token antes de criar a sessão local.
6. Para upload de imagens, configure `SUPABASE_SECRET_KEY` apenas no backend e crie um bucket público (padrão `agrifam-images`, ou defina `SUPABASE_STORAGE_BUCKET`). Nunca exponha a secret/service role key no frontend.
7. Em desenvolvimento local, `script.js` usa automaticamente o mesmo host do site (`localhost` ou `127.0.0.1`) para a API em `:3333`. Ao publicar com a API em outro endereço, defina `window.AGRIFAM_API_BASE` antes de carregar `script.js` (por exemplo, `https://api.seudominio.com/api`) e configure o CORS do servidor para o domínio do site.

### Responsabilidade de cada lado

**Frontend:** exibir dados, validar campos básicos, controlar estados visuais, enviar requisições e mostrar mensagens de sucesso ou erro.

**Backend:** autenticar usuários, validar todos os dados novamente, autorizar acesso, calcular preços, persistir pedidos e conversas, e proteger segredos.

O frontend nunca contém senha, token privado ou regra de preço considerada confiável — `POST /api/pedidos` sempre recalcula o preço a partir do produto no banco, ignorando o que vier do cliente.

### Painel do produtor ("Meus produtos")

Um produtor autenticado tem acesso a um painel para cadastrar, editar e remover seus
próprios produtos, sem precisar chamar a API diretamente. No cabeçalho, o botão "Vender
no AgriFam" vira **"Meus produtos"** assim que o usuário logado tem `role: "producer"`
(ver `updateAuthUI()` em `script.js`) e abre o modal `#myProductsModal`.

- O formulário cadastra (`POST /api/produtos`) ou atualiza (`PATCH /api/produtos/:id`,
  ao clicar em "Editar" num item da lista) um produto.
- "Remover" chama `DELETE /api/produtos/:id` (com uma confirmação nativa do navegador).
- A lista vem de `GET /api/produtor/produtos` — um endpoint que não existia antes desta
  tela: os outros endpoints de produto não filtram por dono, e sem ele o frontend não
  tinha como saber com segurança quais produtos são do produtor logado (o campo
  `producer` da resposta é só o nome da propriedade, que não é garantido único no
  banco).
- Depois de qualquer criação/edição/remoção, o catálogo público e as categorias são
  recarregados (`refreshCatalogAfterChange()`), para preço e contagem não ficarem
  desatualizados no resto do site.

## API do backend

O backend em `server/` (Node.js + Express + TypeScript + Drizzle + PostgreSQL/Supabase) implementa
autenticação, catálogo, pedidos e conversas (Fases 1 a 4 do [TODO.md](TODO.md)) — todas
as fases do backend planejadas, e todas já ligadas ao frontend (Fase 5).

Configure `server/.env` usando `server/.env.example` e a URI PostgreSQL em Supabase >
Connect. Rode `cd server && npm ci && npm run dev`; a API sobe em
`http://localhost:3333` e usa o schema PostgreSQL preparado em `server/supabase-schema.sql`.
O servidor não aplica migrations nem insere seed ao iniciar, para não alterar seu banco
remoto automaticamente. `npm run db:seed` é uma ação manual e só deve ser executada
quando você realmente quiser os dados de demonstração.

### Autenticação

| Rota | Método | Corpo (JSON) | Resposta em caso de sucesso |
| --- | --- | --- | --- |
| `/api/auth/register` | POST | `{ "name", "email", "password", "role": "buyer" \| "producer" }` — se `role` for `"producer"`, exige também `{ "property", "location", "specialty" }` (`"history"`/`"image"` opcionais) | `201` + `{ "user": { id, name, email, role } }`, define cookie de sessão |
| `/api/auth` | POST | `{ "email", "password" }` | `200` + `{ "user": {...} }`, define cookie de sessão |
| `/api/auth/logout` | POST | — | `200` + `{ "ok": true }`, limpa o cookie |
| `/api/auth/me` | GET | — (usa o cookie de sessão) | `200` + `{ "user": {...} }`, ou `401` se não autenticado |

A sessão é um JWT em cookie `httpOnly` (`agrifam_token`), válido por 7 dias.

### Catálogo

| Rota | Método | Corpo/Query | Resposta em caso de sucesso |
| --- | --- | --- | --- |
| `/api/produtos` | GET | Query: `search`, `category`, `sort` (`featured`\|`price-low`\|`rating`) | `200` + `Product[]` (mesmo formato de [types.ts](types.ts)) |
| `/api/produtos/:id` | GET | — | `200` + `Product`, ou `404` |
| `/api/produtos` | POST | `{ "name", "price", "unit", "location", "category", "image"?, "rating"? }` — precisa de sessão com `role: "producer"` | `201` + `Product` |
| `/api/produtos/:id` | PATCH | Qualquer subconjunto dos campos acima — só o produtor dono do produto pode alterar | `200` + `Product`, ou `403` se não for o dono |
| `/api/produtos/:id` | DELETE | — só o produtor dono do produto pode remover | `200` + `{ "ok": true }`, ou `403` se não for o dono |
| `/api/produtor/produtos` | GET | — precisa de sessão com `role: "producer"` | `200` + `Product[]`, só os produtos do produtor autenticado (usado pelo painel "Meus produtos") |
| `/api/produtores` | GET | — | `200` + `Producer[]` |
| `/api/produtores/:id` | GET | — | `200` + `Producer`, ou `404` |
| `/api/categorias` | GET | — | `200` + `{ id, name, icon, count }[]` — `count` é calculado a partir dos produtos reais, não é um valor fixo |

### Pedidos

Pedidos são **simulados nesta fase**: não há gateway de pagamento integrado ainda, todo
pedido nasce com `status: "confirmado"`. Qualquer usuário autenticado pode comprar
(comprador ou produtor). O preço de cada item é sempre recalculado a partir do produto
no banco — o backend ignora qualquer preço enviado pelo cliente no corpo da requisição.

| Rota | Método | Corpo (JSON) | Resposta em caso de sucesso |
| --- | --- | --- | --- |
| `/api/pedidos` | POST | `{ "items": [{ "productId", "quantity" }] }` (ver `CreateOrderInput` em [types.ts](types.ts)) | `201` + `Order` (ver `Order`/`OrderItem` em types.ts) |
| `/api/pedidos` | GET | — | `200` + `Order[]`, só os pedidos do usuário autenticado |
| `/api/pedidos/:id` | GET | — | `200` + `Order`, ou `403` se o pedido não for do usuário autenticado |
| `/api/produtor/pedidos` | GET | — precisa de sessão com `role: "producer"` | `200` + lista de itens de pedido que incluem produtos do produtor autenticado (com `buyerName`, `productName`, `quantity`, `subtotal`, etc.) |

### Conversas

Uma conversa é sempre entre um comprador e um produtor (identificado pelo `producerId`
de `GET /api/produtores`); existe no máximo uma conversa por par comprador-produtor —
iniciar de novo com o mesmo produtor devolve a conversa já existente em vez de duplicar.

| Rota | Método | Corpo (JSON) | Resposta em caso de sucesso |
| --- | --- | --- | --- |
| `/api/conversas` | GET | — | `200` + `ConversationSummary[]` (conversas em que o usuário autenticado participa, como comprador ou como produtor) |
| `/api/conversas` | POST | `{ "producerId" }` | `201` + conversa nova, ou `200` + conversa já existente entre esse par |
| `/api/conversas/:id/mensagens` | GET | — só participantes da conversa | `200` + `Message[]`, em ordem cronológica |
| `/api/conversas/:id/mensagens` | POST | `{ "text" }` (1 a 2000 caracteres) | `201` + `Message` |

Erros seguem sempre o formato `{ "error": "mensagem" }`, com os códigos HTTP `400`
(dados inválidos, categoria/produto inexistente, produtor iniciando conversa consigo
mesmo), `401` (sem sessão), `403` (perfil/dono errado, ou não participa da conversa) e
`409` (email já cadastrado no registro).

## Organização dos arquivos

- `index.html`: estrutura semântica, navegação, seções, modais e pontos de montagem dinâmicos.
- `style.css`: tokens visuais, componentes, estados de interação, mapa, conversas e responsividade. As seções estão numeradas no início do arquivo.
- `script.js`: comportamento executado no navegador, dados demonstrativos, busca, filtros, carrinho, chat, modais e carrossel.
- `script.ts`: base tipada para a migração gradual do comportamento para TypeScript.
- `types.ts`: contratos compartilhados de categorias, produtos, produtores, carrinho e filtros.
- `asset/`: imagens e ícones locais usados pela interface.
- `server/`: backend (Node.js + Express + TypeScript), com o próprio `package.json`,
  testes (`src/tests`) e schema do banco (`src/db`). Ver [CLAUDE.md](CLAUDE.md) e
  [TODO.md](TODO.md) para arquitetura, decisões e roadmap.

## Desenvolvimento

Instale as dependências e valide o TypeScript:

```bash
npm install
npm run check
npm run build
```

## Tipografia e estilos

- **Poppins**: títulos, chamadas e elementos de destaque.
- **Nunito Sans**: textos, navegação e controles, priorizando leitura confortável.

As fontes são carregadas no `<head>` de `index.html` e expostas pelos tokens `--display` e `--sans` no `style.css`.

Os principais tokens visuais ficam no bloco `:root` de `style.css`: `--green`, `--green-dark`, `--ink`, `--muted`, `--cream`, `--line`, `--white`, `--display`, `--sans` e `--shadow`.

## Antes de enviar alterações

1. Execute `npm run check` para verificar os contratos TypeScript.
2. Execute `npx prettier --write index.html style.css script.js script.ts types.ts tsconfig.json` depois de editar os arquivos.
3. Confira `git diff --check` para detectar problemas de espaços e formatação.

## Próximos passos (fora do escopo já implementado)

- Recuperação de senha (hoje o link só avisa que ainda não está disponível).
- Gateway de pagamento real (checkout hoje é simulado, ver Fase 3 do TODO.md).
- Deploy em produção (Vercel + Turso — Fase 6 do TODO.md).
