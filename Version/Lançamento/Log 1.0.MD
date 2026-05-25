# Dragon SX2000 — Log de Lançamento

## Versão 1.0 (Beta)

| | |
|---|---|
| **Versão** | Beta 1.0 |
| **Data de lançamento** | 07/06/2026 |
| **Plataforma** | Desktop (Electron) |

---

## O que foi implementado

### Tela Inicial & Home

| Funcionalidade | Descrição |
|---|---|
| **Tela Home** | Página inicial com logo, tagline e barra de busca centralizada |
| **Busca na Home** | Formulário de pesquisa com foco automático ao abrir o navegador |
| **Links rápidos** | Atalhos para YouTube, GitHub, Stack Overflow e Reddit |
| **Background dinâmico** | Suporte a wallpaper em imagem ou vídeo aplicado ao fundo da Home |
| **Visibilidade dos widgets** | Auto Tunes aparecem somente na Home; Music persiste em todas as telas |

### Gerenciamento de Abas & Páginas

| Funcionalidade | Descrição |
|---|---|
| **Adicionar Page (Nova aba)** | Criação de abas Home (`New Tab`) e abas de navegação via botão `+` ou `Ctrl+T` |
| **Deletar Page (Fechar aba)** | Fechamento de abas com botão `×` ou atalho `Ctrl+W` |
| **Webview integrado** | Cada aba carrega sites em `<webview>` nativo do Electron |
| **Título e favicon dinâmicos** | Atualização automática do título e ícone conforme a página carrega |
| **Drag-and-drop de abas** | Reordenação visual com ghost, placeholder e efeitos de blur |
| **Animações de transição** | Troca suave entre abas com easing e efeitos visuais |
| **Barra de abas adaptativa** | Layout responsivo quando há muitas abas abertas |
| **Conversão Home → Navegação** | Aba Home vira aba normal ao realizar a primeira busca ou abrir URL |
| **Botão `+` na última aba** | Atalho visual para abrir nova aba diretamente na barra |

### Navegação & Barra de Endereço

| Funcionalidade | Descrição |
|---|---|
| **Barra de endereço inteligente** | Detecta URL ou termo de busca e redireciona automaticamente |
| **Exibição de domínio** | Mostra só o hostname quando desfocado; URL completa ao focar |
| **Voltar / Avançar** | Botões de navegação com estado habilitado/desabilitado dinâmico |
| **Histórico por aba** | Navegação `goBack()` / `goForward()` no webview ativo |
| **Google como busca padrão** | Termos digitados sem protocolo abrem `google.com/search` |

### Sistema de Busca (Google)

| Funcionalidade | Descrição |
|---|---|
| **Busca na Home** | Pesquisa direta pelo formulário central da tela inicial |
| **Busca na barra de endereço** | Pesquisa ou abertura de URL pela barra superior |
| **Paleta de busca (`Ctrl+Espaço`)** | Overlay flutuante para buscar ou colar URL sem voltar à Home |
| **Auto Tune Share** | Widget com campo de busca rápida integrado ao Google |
| **Links rápidos** | Busca instantânea por sites populares na Home |
| **API Backend `/search`** | Endpoint Express que retorna URL de redirecionamento para o Google |

### Persistência de Dados

| Módulo | Chave / Armazenamento | O que salva |
|---|---|---|
| **Auto Tunes** | `settingsAUTO` | Posição, tamanho e estado ativo/inativo de cada widget |
| **Factory** | `autotuneFactorySettings` | Cores, tipografia, CSS customizado por componente |
| **Wallpaper** | `wallpaperState` | Imagem/vídeo, transformações (rotação, flip, posição) |
| **Tema** | `themeMode` | Modo claro, escuro ou sistema |
| **Tasklist** | `autotuneTasklistData` | Tarefas, tempo rastreado e tarefa ativa |
| **Timer (Pomodoro)** | `autotunePomodoroSettings` | Duração de foco e pausa |
| **Atalhos** | `dragonsx.shortcuts.bindings` | Combos de teclado personalizados pelo usuário |
| **Migração legada** | `autotuneCosmetics` → `settingsAUTO` | Conversão automática de dados antigos |

### Auto Tunes — Widgets Flutuantes

| Widget | Funcionalidade | Detalhes |
|---|---|---|
| **Timer** | Pomodoro / cronômetro | Fases de foco e pausa configuráveis, ciclos, play/pause/reset |
| **Tasklist** | Lista de tarefas | Adicionar, concluir e remover tarefas; rastreamento de tempo por tarefa |
| **Share** | Busca rápida | Campo de pesquisa que abre Google ou URL em nova aba |
| **Music** | Now Playing | Capa, título, artista, barra de progresso e controles play/pause/anterior/próxima |
| **FocusFlow (Fusão)** | Timer + Tasklist unidos | Fusão automática ao sobrepor widgets; divisível novamente |
| **Arrastar & redimensionar** | Posicionamento livre | Widgets flutuantes com handle de resize no canto |
| **Painel de controle** | Ativar / desativar | Toggle por widget no painel AutoTune; posição guardada ao desativar |
| **Anti-sobreposição** | Colisão inteligente | Reposicionamento automático para evitar widgets empilhados |
| **Gating de mídia (Music)** | Exibição condicional | Widget Music só aparece quando há mídia ativa no sistema |

### Sistema de Imagem & Vídeo (Wallpaper)

| Funcionalidade | Descrição |
|---|---|
| **Upload de imagem** | Seleção de arquivos `image/*` com pré-visualização |
| **Upload de vídeo** | Seleção de arquivos `video/*` com reprodução em loop |
| **Ajustes visuais** | Rotação (-180° a 180°), flip horizontal e vertical |
| **Arrastar no preview** | Posicionamento manual do wallpaper antes de aplicar |
| **Aplicar ao fundo** | Wallpaper aplicado na `.background` da interface com barra de progresso |
| **Persistência** | Estado salvo e restaurado automaticamente na próxima sessão |

### Factory de Personalização

| Funcionalidade | Descrição |
|---|---|
| **Stage 1 — Visual** | Cor principal, intensidade, opacidades, bordas, tipografia e tamanho mínimo |
| **Stage 2 — CSS/SCSS** | Editor de código com preview ao vivo e injeção de estrutura HTML |
| **Controles customizados** | Sliders específicos por widget (Timer, Share, Tasklist, Music) |
| **Preview em tempo real** | Clone do componente atualizado instantaneamente |
| **Persistência por componente** | Estilos salvos e reaplicados automaticamente ao reiniciar |
| **Acesso via ⚙** | Botão Factory em cada linha do catálogo AutoTune |

### Tema & Aparência

| Funcionalidade | Descrição |
|---|---|
| **Modo claro** | Tema light aplicado via `data-theme` |
| **Modo escuro** | Tema dark como padrão |
| **Modo sistema** | Segue `prefers-color-scheme` do SO automaticamente |
| **Alternância cíclica** | Botão na barra lateral alterna Claro → Escuro → Sistema |
| **Glassmorphism** | Efeitos de vidro fosco, blur e animações na interface |
| **Ícones Lucide** | Biblioteca de ícones SVG integrada na barra lateral |

### Barra Lateral (Idgets)

| Idget | Função |
|---|---|
| **Wallpaper** | Painel para upload e ajuste de wallpaper |
| **Tema** | Alternador de modo claro/escuro/sistema |
| **Customise** | Espaço reservado para personalização avançada |
| **Donate** | Widget de apoio ao projeto |
| **AutoTune** | Catálogo para ativar widgets e abrir Factory |
| **Hover animado** | Tooltip e highlight que seguem o mouse na barra lateral |

### Atalhos de Teclado

| Atalho | Ação |
|---|---|
| `Ctrl+Espaço` | Abrir / fechar paleta de busca flutuante |
| `Ctrl+T` | Nova aba (Home) |
| `Ctrl+W` | Fechar aba ativa |
| `Ctrl+Tab` | Próxima aba |
| `Ctrl+Shift+Tab` | Aba anterior |
| **Bindings customizáveis** | ShortcutManager permite remapear atalhos com persistência |

### Dragon Media SDK

| Funcionalidade | Descrição |
|---|---|
| **Processo filho** | SDK iniciado automaticamente pelo Electron em background |
| **WebSocket local** | Comunicação via `ws://127.0.0.1:8974` |
| **Captura SMTC** | Leitura de mídia do sistema (Windows / macOS) |
| **Now Playing** | Título, artista, capa, duração e posição em tempo real |
| **Controles de mídia** | Play/pause, faixa anterior e próxima via bridge |
| **Reconexão automática** | Backoff exponencial em caso de queda de conexão |
| **Bridge frontend** | `window.DragonMedia` expõe snapshot, eventos e comandos |

### Infraestrutura & Backend

| Componente | Descrição |
|---|---|
| **Electron 41** | Shell desktop com suporte a `<webview>` |
| **Express 5** | API REST com CORS na porta 5000 |
| **Endpoint `/search`** | Retorna `redirectUrl` para busca no Google |
| **Node.js ≥ 18** | Runtime para SDK e backend |
| **Arquitetura modular** | Frontend, UserINTer (widgets), Backend e SDK separados |

---

## Próxima versão

| Funcionalidade | Descrição | Prioridade |
|---|---|---|
| **Histórico de Downloads** | Registro e consulta de arquivos baixados pelo navegador | Alta |
| **Histórico de Pesquisa** | Acesso rápido às buscas realizadas anteriormente | Alta |
| **Customizer de Componentes Fixos** | Personalização avançada de elementos permanentes da interface | Média |
| **Customizer de Abas** | Estilização e comportamento customizável das abas | Média |
| **Auto Tune Clock** | Novo widget com relógios personalizados | Média |
| **Novos Auto Tunes** | Expansão da biblioteca de widgets flutuantes | Média |

---

## Bugs conhecidos

| Bug | Área | Descrição | Plataforma |
|---|---|---|---|
| **Interação dos Auto Tunes** | Auto Tunes | Comportamento inconsistente entre widgets em certas situações | Todas |
| **SCSS** | Factory | Suporte e integração de estilos SCSS ainda incompletos | Todas |
| **Auto Tune Music** | Dragon Media SDK | Não integra corretamente com captura de mídia do sistema | macOS, Linux |
| **Vídeos pré-renderizados** | Wallpaper | Falhas na reprodução ou exibição de certos formatos de vídeo | Todas |
| **Interface Auto Tune minimizada** | Auto Tunes | Comportamento instável quando a janela do navegador é minimizada | Todas |

---

<p align="center">
  <sub>Dragon SX2000 Beta 1.0 — © Pedro Henrique Carneichuk Rosa</sub>
</p>
