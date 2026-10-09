# Sessão do perfil

A API-DSX continua no processo que já existe. Ao escolher o usuário, `POST /session/open` carrega uma lista na memória. O que pode esperar não acorda o disco a cada evento.

O timer da API grava essa lista **a cada 5 minutos**, só se ela mudou. Ao fechar o navegador, um flush único mostra "Salvando…" e chama `POST /session/flush`. Não há vigia de mouse, teclado ou vídeo.

Senha, login e apagar dados gravam no SQLite antes da resposta.

## Imediato

A resposta só volta depois do banco.

| Rota | Motivo |
|---|---|
| `POST/PATCH/DELETE /vault`, `reveal`, `unlock`, `lock` | Senha não pode ficar só na memória |
| `POST/PATCH/DELETE /users`, `POST /users/:id/unlock` | Conta e senha do perfil |
| `DELETE /history`, `DELETE /history/:id` | Esquecer a visita na hora |
| `DELETE /favorites`, `DELETE /favorites/:id`, `DELETE /favorites/by-url` | Tirar favorito na hora |
| `DELETE /downloads`, `DELETE /downloads/:id` | Tirar download na hora |
| `DELETE /tab-groups/:id` | Apagar o grupo na hora |

`POST /users/:id/touch` só marca `last_active_at`. Entra no diário e desce no flush.

## Diário

A API atualiza a lista e responde. O disco espera o timer ou o fechar.

| Rota | O que fica na lista |
|---|---|
| `POST /history` | Visita (contagem e título) |
| `POST /downloads`, `PATCH /downloads/:id` | Download e o estado |
| `POST /favorites` | Favorito novo |
| `POST /tab-groups`, `PATCH /tab-groups/:id` | Grupo |
| `PUT /tab-groups/:id/tabs` | Snapshot das abas |

## Lista carregada no open

- Histórico: os 500 mais recentes e os 100 mais visitados
- Favoritos, downloads e grupos de abas do usuário, inteiros

`GET /history/suggestions` filtra essa lista. A ordem continua a de hoje: mais visitas, digitação e recência, e login salvo desempata. As sugestões do Google seguem quando a caixa de busca está aberta.

`GET /history` e `GET /history/search` leem a tabela uma vez e misturam o que ainda está no diário, para a tela de histórico ver também o que é antigo.

## Arquivos

| Arquivo | Papel |
|---|---|
| `Session/sessionStore.js` | Listas e diário |
| `Session/sessionHydrate.js` | Leitura única ao abrir o perfil |
| `Session/historyMemory.js`, `favoritesMemory.js`, `downloadsMemory.js`, `groupsMemory.js` | Mutação em memória |
| `Session/sessionFlush.js` | Uma transação WAL |
| `Session/sessionTimer.js` | Intervalo de 5 minutos |
| `Services/sessionService.js` | Fachada para os outros serviços |
| `routes/sessionRoutes.js` | `POST /session/open` e `POST /session/flush` |
