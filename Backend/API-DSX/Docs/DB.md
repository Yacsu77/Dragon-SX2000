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

Ver também: [UserBundle.md](UserBundle.md), [SyncAdapter.md](SyncAdapter.md).
