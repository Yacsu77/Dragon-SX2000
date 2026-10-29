# Baseline v1.4 — referência da v1.5

Medido em **2026-09-30** no commit de trabalho da branch `Versão-1.5`, app **v1.4.0** (Electron **41.10.3**, Node do Electron **24.18.0**, Chrome **146.0.7680.216**).

`v1.4.0` continua congelada como referência de build: `scripts/verify-build.js` exige essa versão. O bump para `1.5.0` é a Etapa 8.

Ferramenta: `npm run perf:static` e `npm run perf:measure` (`scripts/perf/measure.js`). Instrumentação no main (`Main/bootstrap/PerfProbe.js`, no-op sem `DSX_PERF_OUT`) e marcas do renderer via `window.DragonPerf`.

Host desta medição: **darwin arm64, 8 núcleos, 8 GB** (`os.totalmem()` arredonda para 9 no JSON). É a classe da máquina **R2** do arquivo de metas, não o R1 (Windows) nem o R3 (Linux). Números de R1/R3 ficam **a medir** — o gate de release usa o R1.

## Estático (as três máquinas)

Independente de SO. Fonte: `node scripts/perf/measure.js --static`.

| Métrica | v1.4.0 |
|---|---|
| `<script>` em `Frontend/src/index.html` | 139 |
| Scripts dinâmicos do Tabline (`WIDGET_SCRIPTS`) | 42 |
| JS no boot (sem bundler) | **181** |
| `<link>` de CSS / `@import` no manifest | 1 / 39 |
| Linhas `Frontend/src` | 22 674 (164 arquivos) |
| Linhas `Frontend/Telas` + `MiniTelas` | 3 953 + 463 |
| Linhas `UserINTer` | 11 263 |
| Linhas Factory | 1 114 |
| Linhas Customise | 4 220 |
| Linhas AutoTune | 4 266 |
| Camada de edição (Factory + Customise + `Clock/factory.js`) | **5 634** |
| Linhas `Main` / `MediaDrm` | 4 540 / 740 |
| Fonte `Backend/API-DSX` / `Backend/SDK` | 3 015 / 2 361 |
| `node_modules` da API-DSX | 4 074 arquivos · **17,3 MB** |
| `node_modules` do SDK | 236 arquivos · **1,8 MB** |
| Deps nativas / de runtime da API | express, cors, dotenv, sqlite3, redis (o pacote `redis` não é o cliente usado — `DB/redis.js` fala RESP na mão) |
| Deps do SDK | ws, dbus-next, `@coooookies/windows-smtc-monitor` |
| Instalador em `release/` | nenhum medido |

## Runtime — darwin arm64 (3 execuções, ocioso 10 s, mediana)

`node scripts/perf/measure.js --runs 3 --idle 10000`.

| Marco (desde o início do processo main) | Mediana |
|---|---|
| `app-ready` | 1 644 ms |
| `drm-ready` | 1 653 ms |
| `sdk-spawned` | 1 848 ms |
| `api-ready` (abs.) | 1 926 ms |
| Espera do main pela API (`api-ready − sdk-spawned`) | **68 ms — contaminada, ver nota** |
| Janela criada | 2 640 ms |
| `index.html` `did-finish-load` / scripts parseados | **5 785 ms** |
| Widgets do Tabline carregados | não disparou |
| Workspace montado | não disparou |
| RSS do main | 124 MB |
| Processos Electron desta execução | 4 (Browser, GPU, Network, Tab) |
| RSS Electron desta execução | **354 MB** |
| Filhos Node (API + SDK) | **0 — contaminado, ver nota** |

`app-ready` nas três execuções: 1 958 ms, 1 644 ms e 614 ms (a terceira já pegou cache de disco). JSON bruto em `perf-results/baseline-mac.json` (gitignored).

### Notas do que esta medição NÃO é

1. **Portas 3333 e 8974 já estavam ocupadas** por um `npm run start` do próprio usuário (aberto ~30 min). O supervisor viu `/ready` da instância alheia e **não spawnou** API nem SDK (`pid: null`). Os 68 ms e os "0 filhos" não são o cold start. Não matei esse processo.
2. **`workspace-mounted` não dispara em lançamento frio sem perfil escolhido.** `initApp` marca `scripts-parsed` e para no `UserGate` até haver sessão. As marcas de Tabline/workspace medem o pós-login, não o parse do HTML.
3. O RSS de 354 MB é só o Chromium dessa execução (sem backend, sem sessão, sem widgets). Não é o "app ocioso na Home" da meta.

## API-DSX sozinha — cold start (porta 3339, DB novo)

`boot.js` via Node, três vezes seguidas, DB temporário:

| Execução | listen | `/ready` | RSS |
|---|---|---|---|
| 1 (fria, sem cache de disco) | 2 336 ms | **2 526 ms** | 56 MB |
| 2 | 765 ms | 874 ms | 61 MB |
| 3 | 180 ms | 205 ms | 61 MB |
| Mediana | 765 ms | 874 ms | 61 MB |

A mediana é otimista: o cache de página do SQLite/Node esquenta entre as execuções. Para a meta de cold start, o número honesto desta máquina é o da **primeira execução: ~2,5 s até `/ready`**, mais os ~0,5 s fixos de `_freePort3333` no supervisor, que esta prova isolada não inclui.

## Instância já aberta do usuário (não é baseline de idle)

Só para não perder o dado, medido com `ps` na árvore do `npm run start` (~30 min, sessão real, não Home limpa):

| Processo | RSS |
|---|---|
| Electron main | 116 MB |
| API-DSX (`boot.js`) | 35 MB |
| Media SDK (`server.js`) | 33 MB |
| `nowplaying-cli` (vivo no instante) | 43 MB |
| Árvore inteira (10 processos, inclui renderer com a sessão) | ~957 MB |

`nowplaying-cli` apareceu em 24 de ~50 amostras de 100 ms (5 s). Bate com o poll de ~800 ms do `MacOSCapture`: processo efêmero, não um filho persistente, mas aceso boa parte do tempo.

## O que ainda falta medir (R1, R2 limpo, R3)

| Métrica da meta | Este host | R1 Windows | R3 Linux |
|---|---|---|---|
| Primeira janela visível, cold, sem outra instância | 2,6 s até criar; 5,8 s até o HTML (darwin) | a medir | a medir |
| Workspace montado (com perfil) | a medir — o gate bloqueia | a medir | a medir |
| Espera real do main pela API no boot do app | a medir (aqui deu 68 ms falsos) | a medir | a medir |
| RSS total ocioso na Home, 1 aba | a medir | a medir | a medir |
| Tamanho do instalador | a medir (`release/` vazio) | a medir | a medir |

Repetir com o app fechado: `npm run perf:measure -- --runs 3 --json perf-results/baseline-<so>.json`.
