<p align="center">
  <img src="Version/Banner.png" alt="DSX — Um navegador com a sua cara" width="100%">
</p>

<h1 align="center">DSX</h1>

<p align="center">
  <strong>v1.4.0 Beta</strong>
</p>

<p align="center">
  <em>Lançamento: 04/08/2026</em>
</p>

<p align="center">
  <a href="https://dragonsx.com.br">
    <img
      src="https://img.shields.io/badge/Site-dragonsx.com.br-111111?style=for-the-badge"
      alt="Site oficial"
    />
  </a>
  <a href="https://github.com/Yacsu77/Dragon-SX2000/releases">
    <img
      src="https://img.shields.io/badge/Download-GitHub%20Releases-24292F?style=for-the-badge&logo=github&logoColor=white"
      alt="Download no GitHub Releases"
    />
  </a>
</p>

<p align="center">

  <!-- Electron -->
  <a href="https://www.electronjs.org/" target="_blank">
    <img
      src="https://img.shields.io/badge/Electron-47848F?style=for-the-badge&logo=electron&logoColor=white&labelColor=000000"
      alt="Electron"
    />
  </a>

  <!-- Node.js -->
  <a href="https://nodejs.org/" target="_blank">
    <img
      src="https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=000000"
      alt="Node.js"
    />
  </a>

  <!-- JavaScript -->
  <a href="https://developer.mozilla.org/docs/Web/JavaScript" target="_blank">
    <img
      src="https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black&labelColor=000000"
      alt="JavaScript"
    />
  </a>

  <!-- HTML5 -->
  <a href="https://developer.mozilla.org/docs/Web/HTML" target="_blank">
    <img
      src="https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white&labelColor=000000"
      alt="HTML5"
    />
  </a>

  <!-- CSS3 -->
  <a href="https://developer.mozilla.org/docs/Web/CSS" target="_blank">
    <img
      src="https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white&labelColor=000000"
      alt="CSS3"
    />
  </a>

  <!-- Express -->
  <a href="https://expressjs.com/" target="_blank">
    <img
      src="https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white&labelColor=000000"
      alt="Express"
    />
  </a>

  <!-- WebSocket -->
  <a href="https://developer.mozilla.org/docs/Web/API/WebSockets_API" target="_blank">
    <img
      src="https://img.shields.io/badge/WebSocket-010101?style=for-the-badge&logo=socketdotio&logoColor=white&labelColor=000000"
      alt="WebSocket"
    />
  </a>

</p>

---

## Sobre o Projeto

O **DSX** (sucessor do Dragon SX2000) é um navegador desktop **open source** pensado para quem quer ir além do comum. Cada detalhe pode refletir a sua identidade — wallpapers, temas, widgets AutoTune e uma interface modular feita para personalização.

---

## Versão e downloads

| | |
|---|---|
| **Versão disponível** | **v1.4.0 Beta** |
| **Lançamento** | **04/08/2026** |
| **Site** | [dragonsx.com.br](https://dragonsx.com.br) |
| **Executáveis** | [dragonsx.com.br](https://dragonsx.com.br) · [GitHub Releases](https://github.com/Yacsu77/Dragon-SX2000/releases) |

Os instaladores usam o prefixo **DSX**:

- Windows: `DSX-1.4.0-win-x64.exe`
- macOS: `DSX-1.4.0-mac-x64.dmg` / `arm64`
- Linux: `DSX-1.4.0-linux-x64.deb` e `.AppImage`

---

## Destaques da v1.4

- **Grupos de abas** por usuário (API SQLite + UI + sincronização de snapshots)
- **Layout Topo Global** no Customise — busca, botões, Music, acabamento e abas
- **Busca Inteligente** compartilhada (topo, AutoTune, Shortcuts) com autocomplete por domínio e sugestões do Google
- **Gerenciador de senhas** estilo Safari com login automático por formulário e por URL
- **Music minimal** com posições: esquerda, direita (entre busca e botões) ou embaixo
- **Multijanelas (Janelas)** — preview de aba, detach, transfer entre janelas OS, split in-window, layouts e animações no Customise
- **Desempenho P0–P4** — idle, drag leve, TabWarmth, troca de tela sem piscar, RGB estável em multi-monitor
- Barra de abas mais estável: destaque configurável, condensação com 7+, borda LED opcional
- API SQLite isolada por usuário + boot resiliente (`boot.js`, `/ready` com `starting`)
- **Build empacotado**: API-DSX + Media SDK em `extraResources`; wallpapers WWP incluídos

---

## Funcionalidades

### Navegação e abas

- Sistema de **abas** com drag-and-drop, animações e visão geral estilo Safari
- **Grupos de abas** — painel minimalista, hover com preview, reordenação por arraste
- **Home** com wallpaper visível e widgets AutoTune flutuantes
- Prefetch de conexão, **TabWarmth** (hidratação/discard) e troca de aba sem flash

### Interface e personalização

- **Barra superior** modular: menu, histórico, favoritos, arquivos locais, downloads
- **Layout Topo Global** — grid centrado, slots de Music à esquerda/direita/embaixo
- **AutoTune** — widgets flutuantes (Timer, Music, Clock, Share, Tasklist)
- **Wallpaper** com imagem e vídeo — persistência em disco (`userData/wallpapers/`)
- **Factory / Customise** de personalização visual por componente

### Busca, senhas e mídia

- **Busca Inteligente** — histórico, Vault, sessões ativas e sugestões do Google
- **Gerenciador de senhas** com preenchimento automático
- **Dragon Media SDK** — now playing, controles e volume em tempo real via WebSocket

### Multijanelas

- **Preview** de aba ao passar o mouse (≥ 0,5 s)
- **Detach** — arrastar aba para baixo abre nova janela OS
- **Transfer** — soltar aba na barra de outra janela move o conteúdo
- **Split** — dividir em dois painéis no mesmo BrowserWindow

### Atalhos e sistema

- **Atalhos globais** de teclado e mouse ([documentação](Frontend/src/shortcuts/README.md))
- **Tela Editar** — opção de manter abas renderizadas (desempenho)
- **Favoritos** com persistência em localStorage

> Changelog completo: [`Version/Lançamento/Log v1.4.MD`](Version/Lançamento/Log%20v1.4.MD)  
> Release anterior: [`Log v1.3.MD`](Version/Lançamento/Log%20v1.3.MD)  
> Documentação do Frontend: [`Version/Docs/Frontend/Inicial.MD`](Version/Docs/Frontend/Inicial.MD)

---

## Como Executar (desenvolvimento)

### Pré-requisitos

- Node.js (versão LTS recomendada)
- npm

### Instalação

```bash
git clone https://github.com/Yacsu77/Dragon-SX2000.git
cd Dragon-SX2000
npm install
```

### Executar

```bash
npm start
```

### Build local

```bash
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

---

## Contato

| | |
|---|---|
| **E-mail** | [contato@yacsu.com.br](mailto:contato@yacsu.com.br) |
| **Site** | [DragonSX.com.br](https://dragonsx.com.br) |

---

<p align="center">
  <sub>
    DSX 1.4.0 Beta — lançamento 04/08/2026 · dragonsx.com.br — © 2026 Pedro Henrique Carneichuk Rosa
  </sub>
</p>
