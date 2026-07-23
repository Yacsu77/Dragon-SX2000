# Busca Inteligente

**Núcleo:** `Frontend/src/search/SmartSearch.js` · `SmartSearch.css`

Sistema de busca/autocomplete compartilhado por todos os buscadores do app.

## Escopo

A busca inteligente é usada por:

- barra principal do topo (`Frontend/src/Top/Search/Search.js`);
- widget Share do AutoTune (`UserINTer/Tabline/idget/AutoTune/Share/index.js`);
- Search Palette dos atalhos (`Frontend/src/shortcuts/overlays/search-palette/`).

Cada buscador chama `SmartSearch.attach(input, options)`, que injeta o painel de
sugestões e cuida de teclado, submit e navegação.

## Fontes e ranking

1. Histórico do perfil, ordenado por frequência, digitação direta e recência
   (frecência).
2. Sites com login salvo no Vault.
3. Origens com indício de sessão ativa na partition Electron do perfil.
4. Sugestões do Google.

O backend mantém um `ZSET` Redis por usuário (`smart-search:rank:{userId}`).
SQLite permanece como fonte de verdade e fallback quando Redis não estiver
disponível.

### Quantidade de sugestões

- **Sites visitados:** no máximo **2 recomendações** — os mais acessados,
  ranqueados por frecência (mais visitas primeiro, login salvo desempata).
- **Google:** **5 sugestões** quando há recomendação local; **7** quando não há.

### Sugestões do Google iguais ao google.com

As sugestões vêm do endpoint `client=gws-wiz` — o mesmo usado pela caixa de
busca do google.com — então replicam exatamente o que o Google mostra. A
resposta vem no formato `window.google.ac.h([...])` e é desempacotada e limpa de
marcação HTML no backend. Se o gws-wiz falhar, há fallback para `client=chrome`.

**Arquivo:** `Backend/API-DSX/Services/historyService.js`
(`googleSuggestions`, `fetchGwsWizSuggestions`, `fetchChromeSuggestions`).

### Autocomplete inline (observando o domínio)

O autocomplete casa o texto digitado com o **domínio** dos sites recomendados —
seja pelo começo do host, seja pelo início de um label interno:

- digitar `senac` com o site salvo `autenticacao.sp.senac.br` completa como
  `senac.br`;
- digitar `yo` com `youtube.com` completa como `youtube.com`.

O trecho completado fica selecionado (estilo omnibox). `Enter` entra na **URL
real** do site (ex.: a página de login salva). Continuar digitando de forma que
o texto deixe de casar descarta a recomendação; apagar caracteres também não
força re-completação.

## Destino da navegação

| Buscador | Destino |
|---|---|
| Barra do topo | **Aba atual** (aba Home vira aba normal; sem aba ativa, cria uma) |
| AutoTune Share | **Aba atual** |
| Shortcuts (Search Palette) | **Aba nova** (`newTab: true`) |

Centralizado em `SmartSearch.navigate(value, options)`:
`navigateCurrentTab()` reaproveita a webview ativa; `options.newTab` força aba
nova; `options.onNavigate` permite ao chamador assumir a criação da aba.

## Login automático

Ao navegar diretamente para uma URL pela busca, o Password Manager arma uma
tentativa por 20 segundos. Se surgir um formulário de login, não houver sessão
ativa e existir exatamente uma credencial salva, o sistema preenche e envia o
formulário. Com múltiplas contas, mantém a seleção manual.

## Privacidade

Cookies não são enviados ao renderer. O processo principal filtra cookies com
indício de autenticação e expõe somente as origens, nunca nome ou valor
(`session:listKnownOrigins` em `main.js` → `DragonSession` no `preload.js`).

## UI e animações

- O painel é 10% mais largo que a barra de busca em cada lado.
- No Top, o painel usa a **barra de abas como referência**: mede o `#tabsRoot`
  a cada abertura e se posiciona 12px abaixo dele, nunca por cima das abas. Nos
  demais buscadores vale o offset padrão em CSS.
- Animação **descida** (padrão): itens se constroem de cima para baixo, de forma
  escalonada, como se estivessem sendo renderizados.
- Borda LED animada igual às abas selecionadas, com opção **RGB** (padrão) que
  cicla o espectro, ou **1 cor** com cor escolhida pelo usuário.

## Customise → Buscadores

O editor no Customise (chave `dragonsx.smart-search`, arquivos em
`Customise/components/smartSearch/`) permite configurar:

| Opção | Valores |
|---|---|
| Estilo da borda | RGB (espectro animado) ou 1 cor (com color picker) |
| Opacidade do fundo | 40–100% |
| Tamanho da fonte | 90–140% |
| Animação de abertura | Descida ou sem animação por item |

As opções são gravadas em `customiseSettings['dragonsx.smart-search']` e o painel
as relê a cada abertura — não é preciso reiniciar. O `SmartSearch.js` aplica via
variáveis CSS (`--smart-bg-alpha`, `--smart-font-scale`, `--smart-led-rgb`).

## API

| Rota | Descrição |
|---|---|
| `GET /history/suggestions?q=&user_id=` | Retorna `{ sites, google }` combinando histórico, logins, sessões e Google |

Cliente: `HistoryApi.smartSuggestions(query)` em `Frontend/src/js/historyApi.js`.

A feature é anunciada em `/ready` como `smart-suggestions`; o `main.js` exige
essa flag para reaproveitar uma instância da API — instâncias antigas (sem a
rota) são reiniciadas automaticamente.
