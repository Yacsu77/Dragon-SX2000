# Dragon Media SDK

Captura informações de mídia em tempo real do sistema operacional (Spotify, navegador, players nativos) e disponibiliza tudo via **WebSocket local** para qualquer aplicação do ecossistema **Dragon SX2000**.

---

## Arquitetura

```
Spotify / Desktop / Web Player
            │
            ▼
   Media Capture Service       (Windows SMTC / macOS MPNowPlayingInfoCenter)
            │
            ▼
     Dragon Media Core          (normalização, sessões, eventos)
            │
            ▼
   Local WebSocket Server       (ws://127.0.0.1:8974)
            │
            ▼
     Dragon SDK Clients         (Browser Dragon SX2000, widgets, plugins)
```

---

## Estrutura de pastas

```
Backend/SDK/
├── index.js                # Façade pública (DragonMediaSDK)
├── server.js               # Runner standalone (npm start)
├── package.json
├── README.md
├── examples/
│   └── client.html         # Cliente de teste visual
└── src/
    ├── core/
    │   └── DragonMediaCore.js
    ├── capture/
    │   ├── index.js        # Fábrica por plataforma
    │   ├── BaseCapture.js
    │   ├── WindowsCapture.js
    │   ├── MacOSCapture.js
    │   └── NullCapture.js  # Fallback
    ├── websocket/
    │   └── WebSocketServer.js
    ├── events/
    │   ├── EventBus.js
    │   └── eventNames.js
    ├── types/
    │   └── DragonMediaFormat.js
    └── utils/
        ├── logger.js
        └── normalize.js
```

---

## Instalação

```bash
cd Backend/SDK
npm install
```

### Pré-requisitos por plataforma

| Plataforma | Dependência | Como instalar |
|------------|-------------|---------------|
| Windows 10/11 (>= 1809) | `@coooookies/windows-smtc-monitor` + script SMTC | `npm install` em `Backend/SDK` (incluído no `dist:win`) |
| macOS 10.15+ | `nowplaying-cli` | `brew install nowplaying-cli` (ou bundled no `dist:mac`) |
| Linux (MPRIS) | `dbus-next` (npm) | `npm install` em `Backend/SDK` (incluído no `dist:linux` / AppImage) |
| Outros | — | usa `NullCapture` (sem captura, mas WebSocket funciona) |

> Se o capturador nativo não estiver disponível, o SDK **não falha**: ele sobe o WebSocket vazio em modo `NullCapture` para que clientes possam conectar e aguardar.

---

## Como rodar (standalone)

```bash
npm start
# ou com flags
node server.js --debug
node server.js --port=9000 --host=127.0.0.1
```

Saída esperada:

```
[Dragon Media SDK] Iniciando capturador: WindowsCapture
[Dragon Media SDK] [Capture] Capturador SMTC (Windows) iniciado
[Dragon Media SDK] [WS] WebSocket Server ouvindo em ws://127.0.0.1:8974
[Dragon Media SDK] Dragon Media SDK pronto.
```

Teste abrindo `examples/client.html` no navegador (ou clique direto no arquivo). Ele se conecta em `ws://127.0.0.1:8974` e renderiza a faixa atual.

Endpoint HTTP de saúde: `http://127.0.0.1:8974/health`.

---

## Como usar como biblioteca

### Subir o SDK inteiro

```js
const { DragonMediaSDK } = require('./Backend/SDK');

const sdk = new DragonMediaSDK({
  host: '127.0.0.1',
  port: 8974,
  logLevel: 'info',
});

await sdk.start();

// snapshot atual a qualquer momento
console.log(sdk.getSnapshot());

// escutar eventos internos (ex.: integrar com Electron sem WebSocket)
const { InternalEvents } = require('./Backend/SDK');
sdk.bus.on(InternalEvents.TRACK_CHANGED, ({ snapshot }) => {
  console.log('Nova faixa:', snapshot.title, '-', snapshot.artist);
});
```

### Conectar como cliente WebSocket

```js
const ws = new WebSocket('ws://127.0.0.1:8974');

ws.onmessage = (msg) => {
  const { event, data } = JSON.parse(msg.data);
  switch (event) {
    case 'hello':         /* handshake inicial */            break;
    case 'media_change':  /* nova faixa - payload completo */ break;
    case 'media_play':    /* retomada */                      break;
    case 'media_pause':   /* pausa */                         break;
    case 'media_progress':/* atualização de posição */        break;
    case 'media_stop':    /* sessão encerrada */              break;
  }
};
```

---

## Dragon Media Format

Todo dado emitido segue esse formato normalizado:

```jsonc
{
  "app":       "Spotify",
  "title":     "Numb",
  "artist":    "Linkin Park",
  "album":     "Meteora",
  "duration":  185,            // segundos
  "position":  42,             // segundos
  "paused":    false,
  "cover":     "data:image/png;base64,...", // ou URL
  "timestamp": 1730000000000   // ms (unix)
}
```

---

## Eventos

### Eventos públicos (WebSocket)

| Evento | Quando | Payload |
|--------|--------|---------|
| `hello` | Handshake na conexão | `{ sdk, version, hasSession, snapshot }` |
| `media_change` | Faixa nova ou app diferente | `DragonMediaFormat` |
| `media_play` | Reprodução retomada | `{ paused: false, position, timestamp }` |
| `media_pause` | Reprodução pausada | `{ paused: true, position, timestamp }` |
| `media_progress` | Atualização de posição (~1s) | `{ position, duration, paused, timestamp }` |
| `media_stop` | Sessão encerrada | `{ lastApp, timestamp }` |
| `error` | Erro do capturador | `{ error }` |

### Eventos internos (EventBus)

`TRACK_CHANGED` · `PLAYBACK_PAUSED` · `PLAYBACK_RESUMED` · `POSITION_UPDATED` · `PLAYBACK_STOPPED` · `SESSION_LOST` · `ERROR`

---

## Lógica de captura (passo a passo)

1. **Initialize Media Session Listener** — instancia o capturador correto por plataforma
2. **Detect Active Media Session** — busca a sessão ativa do SO
3. **Extract Metadata** — título, artista, álbum, duração, posição, capa
4. **Normalize Data** — conversão para Dragon Media Format
5. **Emit Internal Event** — publica no EventBus do Core
6. **Broadcast via WebSocket** — distribui para todos os clientes conectados

---

## Roadmap

- [x] Captura Windows (SMTC) e macOS (MPNowPlayingInfoCenter)
- [x] WebSocket local com handshake
- [x] Diff inteligente (não floda eventos repetidos)
- [ ] Discord RPC bridge
- [ ] RGB Sync
- [ ] Wallpaper Sync (cor dominante da capa)
- [ ] Live Lyrics
- [ ] Visualizer Data
- [ ] Sistema de plugins
- [ ] Cloud Sync

---

## Licença

ISC — Dragon SX2000 Team
