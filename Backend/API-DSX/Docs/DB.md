# Banco local API-DSX

SQLite em `DB/dsx-browser.db`. Foreign keys ligadas.

## Tabelas

### users
- `id` TEXT UUID PK
- `nickname` TEXT UNIQUE (case-insensitive)
- `photo_path` TEXT NULL
- `password_hash` / `password_salt` TEXT NULL
- `vault_pin_hash` / `vault_pin_salt` TEXT NULL
- `created_at` / `updated_at` / `last_active_at`

### browser_history
- Campos de visita + `user_id` (e legado `profile_id`)

### downloads / favorites / password_vault
- Todas com `user_id` FK lógica (cascade via service delete)

### tab_groups (v1.4)
- `id` TEXT UUID PK
- `user_id` TEXT NOT NULL → `users(id)` ON DELETE CASCADE
- `name` TEXT NOT NULL
- `color` TEXT NOT NULL
- `icon` TEXT NULL
- `position` INTEGER DEFAULT 0
- `created_at` / `updated_at`
- Índices: `idx_tab_groups_user_id`, `idx_tab_groups_user_position`

### tab_group_tabs (v1.4)
- `id` TEXT UUID PK
- `group_id` TEXT NOT NULL → `tab_groups(id)` ON DELETE CASCADE
- `user_id` TEXT NOT NULL → `users(id)` ON DELETE CASCADE
- `runtime_tab_id` TEXT NULL (id da aba no frontend)
- `url` / `title` / `favicon_url` TEXT
- `is_home` / `active` INTEGER (0|1)
- `position` INTEGER DEFAULT 0
- `created_at` / `updated_at`
- Índices: `idx_tab_group_tabs_group_position`, `idx_tab_group_tabs_user_id`

**API:** `GET/POST /tab-groups`, `PATCH/DELETE /tab-groups/:id`, `PUT /tab-groups/:id/tabs`  
**Cliente:** `window.TabGroupsApi` em `Frontend/src/js/userApi.js`  
**Docs UI:** [`Tabs.MD`](../../../Version/Docs/Frontend/Tabs.MD) · [`Log v1.4.MD`](../../../Version/Lançamento/Log%20v1.4.MD)

Ver também: [UserBundle.md](UserBundle.md), [SyncAdapter.md](SyncAdapter.md).
