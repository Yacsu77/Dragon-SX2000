# SyncAdapter (extensibilidade futura)

Interface pretendida para sincronização remota. **Não implementada** — local continua sendo a única fonte de verdade via repositórios SQLite.

```js
/**
 * @typedef {object} SyncAdapter
 * @property {(userId: string) => Promise<void>} pushUser
 * @property {(userId: string) => Promise<object>} pullUser
 * @property {(userId: string, resource: string) => Promise<void>} pushResource
 * @property {(userId: string, resource: string) => Promise<object[]>} pullResource
 * @property {(handler: Function) => () => void} subscribeRealtime
 */

/** Recursos sincronizáveis: users | history | favorites | downloads | vault_meta */
```

Hoje os Services (`usersService`, `historyService`, …) leem/escrevem SQLite.
Quando sync existir, um adapter remoto pode ser injetado atrás das mesmas interfaces de repositório sem mudar controllers/rotas.
