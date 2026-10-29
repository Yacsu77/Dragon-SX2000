# DSX v1.5 — Metas de Desempenho

| | |
|---|---|
| **Versão alvo** | 1.5.0 |
| **Referência** | v1.4.0 Beta (`v1.4.0-build.15`) |
| **Plano** | [`Plano v1.5.MD`](./Plano%20v1.5.MD) |
| **Baseline** | A medir na Etapa 0 → `Version/Planejamento/Baseline v1.4.MD` |
| **Resultado** | Preencher no fechamento → `Version/Planejamento/Resultado v1.5.MD` |

> Convenção: **Baseline** = número da v1.4 medido pelo script de perf (quando ainda não medido, aparece a estimativa derivada do código, marcada com `~`). **Meta** = valor que a 1.5 precisa atingir. **Gate** = métrica que bloqueia o release se não for atingida.

---

## 1. Metodologia de medição

### Máquinas de referência

| Perfil | Hardware alvo | Uso |
|---|---|---|
| **R1 — Windows x64** | i5 de 8ª geração ou equivalente, 8 GB RAM, SSD | máquina "média" do usuário |
| **R2 — macOS arm64** | Apple M1, 8 GB | referência de desenvolvimento |
| **R3 — Linux x64** | equivalente ao R1, Ubuntu LTS | validação AppImage/deb |

Todas as metas valem para **R1** (o pior caso). R2/R3 são registrados para acompanhamento.

### Ferramentas

| O que medir | Como |
|---|---|
| Tempo de boot (marcos) | `performance.mark()` no main (`app ready`, `core ready`, `window created`, `first paint`, `workspace mounted`) exportados por `scripts/perf/measure.js`; 10 execuções, mediana |
| Cold vs. warm start | Cold: após reboot / limpar cache do SO; warm: segunda abertura consecutiva |
| Memória por processo | `app.getAppMetrics()` (main) + `process.memoryUsage()` do `dsx-core` via `/health`; RSS após 60 s ocioso na Home com 1 aba |
| Processos filhos | `pgrep -P` / `Get-CimInstance Win32_Process` filtrando pelo PID do Electron |
| Latência HTTP local | `autocannon` (ou `wrk`) contra `127.0.0.1:3333`, 10 s, 20 conexões; reportar p50/p95 |
| Latência de evento de mídia | Timestamp do evento no SO (play/pause) vs. `timestamp` do evento WS recebido no renderer |
| Frame time do renderer | Chrome DevTools Performance / `PerformanceObserver('longtask')`; drag de widget por 5 s |
| Scripts/CSS no boot | Contagem de requests de `file://` no DevTools Network + bytes transferidos |
| Tamanho do instalador | Bytes dos artefatos em `release/` |
| Uso de CPU ocioso | Activity Monitor / Task Manager / `top -p` — média de 60 s com app na Home |

### Regras

- Medir sempre com o **mesmo perfil de usuário** (1 usuário, 1 grupo de abas, 5 favoritos, 200 entradas de histórico, 3 senhas no cofre, Clock + Timer ativos).
- Rodar `scripts/perf/measure.js` no CI (job `perf`, Linux) para detectar regressões grosseiras; números oficiais vêm das máquinas de referência.
- Qualquer meta marcada como **Gate** não atingida bloqueia o release 1.5.0.

---

## 2. Metas por área

### 2.1 Boot e processos (Etapa 1)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| Tempo do `app ready` até `dsx-core` `/ready` | `~1,5–3 s` (spawn Node + require express/sqlite3 + init DB) — pior caso **90 s** | **≤ 150 ms** (p50), ≤ 400 ms (p95) | Sim |
| Sleep fixo antes do spawn do backend | 500 ms | **0 ms** | Sim |
| Tempo até primeira janela visível (cold, R1) | a medir (`~3–5 s`) | **≤ 1,5 s** | Sim |
| Tempo até workspace montado (Home com widgets) (cold, R1) | a medir | **≤ 2,5 s** | Não |
| Tempo até primeira janela (warm) | a medir | **≤ 800 ms** | Não |
| Primeira execução após instalar | pode disparar `npm install` (até 300 s) | **igual a qualquer execução** — zero instalação em runtime | Sim |
| Processos filhos persistentes do Electron | **2 Node** (+1 PowerShell no Windows) | **1** (`dsx-core`) em todos os OS | Sim |
| Spawns periódicos de processos | `nowplaying-cli` a cada ~800 ms (macOS), `pactl`/`osascript` sob demanda | **0** spawns periódicos | Sim |
| Dependência de Redis externo | opcional, cliente TCP com timeout 180 ms por comando | **removida** | Sim |
| Reinício automático do core após crash | backoff 2–30 s | **≤ 300 ms** até novo `/ready` | Não |

### 2.2 Memória (Etapas 1 e 2)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| RSS dos processos de backend | `~2 × 60–90 MB` (dois runtimes Node) | **≤ 20 MB** total (`dsx-core`) | Sim |
| RSS total do app ocioso (Home, 1 aba, R1) | a medir | **−20 %** sobre o baseline | Sim |
| RSS do renderer principal ocioso | a medir | **−10 %** sobre o baseline (remoção de Factory/Customise, engine v2) | Não |
| Crescimento de memória em 30 min ocioso (leak) | a medir | **≤ 5 MB** de variação | Sim |

### 2.3 API local e banco (Etapa 1)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| `POST /history` p95 | a medir (`~3–8 ms` Node + sqlite3 async) | **≤ 1,5 ms** | Sim |
| `GET /history/suggestions` p95 (sem Google, 200 entradas) | a medir (carrega todo o histórico e ordena em JS) | **≤ 3 ms** | Sim |
| `GET /history/suggestions` p95 (10.000 entradas) | a medir | **≤ 10 ms** | Não |
| `GET /tab-groups` p95 | a medir | **≤ 1 ms** | Não |
| `POST /vault/unlock` (scrypt N=16384) | `~60–120 ms` bloqueando o event loop da API | **≤ 80 ms** e **não bloqueia** outras requisições (thread dedicada) | Sim |
| `POST /vault` (encrypt AES-GCM) p95 | a medir | **≤ 1 ms** | Não |
| Throughput sustentado (`GET /favorites`) | a medir | **≥ 20.000 req/s** loopback | Não |
| Abertura do DB existente (`dsx-browser.db` da v1.4) | cópia de seed + init | **in place, ≤ 30 ms**, zero perda de registros | Sim |
| Tamanho do binário `dsx-core` | — | **≤ 6 MB** por plataforma | Não |

### 2.4 SDK de mídia (Etapa 1)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| Latência play/pause no SO → evento no renderer | `~800–1.000 ms` (poll 800 ms + spawn CLI no macOS) | **≤ 200 ms** (push por evento do SO) | Sim |
| CPU ocioso do SDK com mídia tocando | a medir (poll + JSON.parse a cada 800 ms) | **≤ 0,5 %** de um núcleo | Sim |
| CPU ocioso sem mídia | a medir | **≈ 0 %** (sem timers ativos) | Não |
| Precisão de `media_progress` | tick de 500–1.000 ms | deriva **≤ 250 ms** em 5 min sem evento do SO | Não |
| Conexão WS do renderer após `hello` | a medir | **≤ 50 ms** | Não |

### 2.5 Renderer e interface (Etapas 2, 3 e 7)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| Arquivos JS carregados no boot | **~181** (139 estáticos + 42 dinâmicos em série) | **≤ 120** sem bundler; **≤ 10** se o bundling da Etapa 7 for aprovado | Não |
| Linhas de JS/CSS removidas com Factory + Customise | 0 | **≥ 5.000 linhas** a menos carregadas no boot | Sim |
| Tempo de parse/execução de scripts até `Tabline.init` concluído | a medir | **−30 %** sobre o baseline | Não |
| Drag de widget AutoTune (frame time) | escrita síncrona de `left/top` em `mousemove` (possível layout por evento) | **≥ 58 fps** (frame ≤ 17 ms) em drag de 5 s; **0 long tasks > 50 ms** | Sim |
| Restauração dos widgets no boot (5 pacotes) | a medir | **≤ 40 ms** total | Não |
| CPU do Clock em background (janela oculta) | tick 1 s sempre ativo | **0 ticks** com `perf-window-hidden` | Não |
| Observers/listeners globais vivos após fechar overlays | Escape do Factory permanece | **0** listeners residuais de editores (não existem mais) | Sim |
| Aparência padrão vs. v1.4 após remover Customise | — | **idêntica** (diff visual das 6 telas principais ≤ 1 % de pixels) | Sim |

### 2.6 Instalador e disco (Etapa 1)

| Métrica | Baseline v1.4 | Meta v1.5 | Gate |
|---|---|---|---|
| Tamanho do instalador Windows (`.exe`) | a medir (inclui `node_modules` de API + SDK em `extraResources`) | **−40 MB** ou mais sobre o baseline | Sim |
| Tamanho do `.dmg` / `.AppImage` | a medir | **−35 MB** ou mais | Não |
| Arquivos em `resources/Backend/**` | milhares (`node_modules`) | **1 binário** + wallpapers | Sim |
| Etapas de build nativas no CI (`@electron/rebuild`) | 1 por OS/arquitetura | **0** (CMake compila o core diretamente) | Não |
| Espaço em `userData` consumido pelo runtime da API (cópia + `node_modules`) | dezenas de MB | **0** (somente `dsx-browser.db`, `autotunes/`, `i18n/`) | Sim |

### 2.7 i18n (Etapa 4)

| Métrica | Meta v1.5 | Gate |
|---|---|---|
| Cobertura de chaves em `pt-BR` e `en-US` | **100 %** (lint verde no CI) | Sim |
| Textos hardcoded remanescentes em atributos monitorados | **0** | Sim |
| Tempo de troca de idioma (sem reiniciar, Home + Tabline + telas abertas) | **≤ 100 ms** | Não |
| Tamanho de um catálogo de idioma | **≤ 80 KB** (JSON não minificado) | Não |
| Download + instalação de um pacote de idioma | **≤ 2 s** em conexão de 10 Mbps | Não |
| Custo do `I18n.apply()` no boot (todas as telas) | **≤ 15 ms** | Não |

### 2.8 Tradução de páginas (Etapa 5)

| Métrica | Meta v1.5 | Gate |
|---|---|---|
| Página de ~3.000 palavras, cache frio | **≤ 1,5 s** até 90 % dos segmentos substituídos (dependente do provedor; medir com o provedor escolhido) | Não |
| Página já traduzida (cache quente) | **≤ 50 ms**, sem rede | Sim |
| Segmentação + coleta de text nodes (página de 3.000 palavras) | **≤ 30 ms** no processo do `<webview>` | Sim |
| Tamanho máximo do lote | **≤ 100 segmentos / 5.000 caracteres** por requisição | Não |
| Integridade do DOM | **0** inputs/formulários alterados; restaurar original em **≤ 20 ms** | Sim |
| Conteúdo dinâmico (MutationObserver) | novo texto traduzido em **≤ 500 ms** após aparecer | Não |

### 2.9 Novos AutoTunes (Etapa 6)

| AutoTune | Métrica | Meta v1.5 |
|---|---|---|
| Bloco de Notas | autosave (`PATCH /notes/:id`) p95 | **≤ 2 ms** |
| Bloco de Notas | abrir nota de 50 KB | **≤ 30 ms** |
| Previsão do Tempo | refresh com cache válido (15 min) | **0** requisições de rede |
| Previsão do Tempo | refresh cache frio (Open-Meteo) | **≤ 800 ms** em 10 Mbps |
| Calendário | render de visão mensal com 200 eventos | **≤ 16 ms** (1 frame) |
| Calendário | import `.ics` com 1.000 eventos | **≤ 300 ms** |
| Todos | CPU com janela oculta | **0** timers ativos (respeitam `PerfIdle`) |

### 2.10 Loja DSX e pacotes (Etapa 3)

| Métrica | Meta v1.5 | Gate |
|---|---|---|
| Verificação de assinatura Ed25519 de um `.dsxa` | **≤ 5 ms** | Não |
| Instalar pacote de 500 KB (download excluído) — extrair + registrar + spawnar | **≤ 300 ms**, sem reiniciar | Sim |
| Pacote com assinatura/hash inválido | **100 %** recusado, sem executar código | Sim |
| Carregar um pacote instalado no boot | **≤ 10 ms** adicional por pacote | Não |

### 2.11 Estabilidade e qualidade (todas as etapas)

| Métrica | Meta v1.5 | Gate |
|---|---|---|
| Testes de contrato HTTP/WS (Node golden → C) | **100 %** passando nos 3 OS | Sim |
| Vetores de teste de crypto (scrypt + AES-GCM) | **100 %** passando; cofres da v1.4 abrem sem reentrada | Sim |
| Testes unitários do `dsx-core` | cobertura **≥ 70 %** de `db/`, `crypto/`, `search/`, `domain/` | Não |
| Sanitizers (ASan/UBSan) no CI Linux | **0** erros na suíte | Sim |
| Warnings de compilação (`-Wall -Wextra -Werror`) | **0** | Não |
| Checklist de regressão manual | **100 %** executado nos 3 OS | Sim |

---

## 3. Resumo dos Gates (bloqueiam o release)

1. `dsx-core` `/ready` ≤ 150 ms (p50); sem sleep fixo; sem `npm install` em runtime.
2. Primeira janela ≤ 1,5 s (cold, R1).
3. 1 processo filho persistente; 0 spawns periódicos; Redis removido.
4. RSS do backend ≤ 20 MB; RSS total −20 %; sem leak (≤ 5 MB / 30 min).
5. `POST /history` p95 ≤ 1,5 ms; `/history/suggestions` p95 ≤ 3 ms; unlock do cofre não bloqueia; DB da v1.4 aberto in place sem perda.
6. Evento de mídia ≤ 200 ms; CPU do SDK ≤ 0,5 %.
7. ≥ 5.000 linhas removidas do boot; drag ≥ 58 fps sem long tasks; aparência padrão idêntica; 0 listeners residuais de editores.
8. Instalador Windows −40 MB; `resources/Backend` = 1 binário; `userData` sem runtime da API.
9. i18n: 100 % de cobertura pt-BR/en-US; 0 textos hardcoded.
10. Tradução: cache quente ≤ 50 ms; coleta ≤ 30 ms; DOM íntegro.
11. Loja: instalação ≤ 300 ms sem reiniciar; pacote inválido 100 % recusado.
12. Qualidade: contratos e vetores de crypto 100 %; ASan/UBSan limpos; regressão manual completa.

---

## 4. Como este documento evolui

- **Etapa 0:** substituir todos os `a medir` / `~` pelos números reais do baseline.
- **Fim de cada etapa:** registrar o valor obtido em uma coluna "Obtido" nas tabelas da área.
- **Fechamento (Etapa 8):** consolidar em `Resultado v1.5.MD` e citar no `Log v1.5.MD`.

---

<p align="center">
  <sub>DSX 1.5 — Metas de Desempenho · dragonsx.com.br — © 2026 Pedro Henrique Carneichuk Rosa</sub>
</p>
