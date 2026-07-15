# UserBundle (contrato de export/import)

Contrato estável para futura exportação/importação de um usuário local.
**Não há endpoints implementados ainda** — apenas o formato.

```json
{
  "version": 1,
  "exportedAt": "ISO-8601",
  "user": {
    "id": "uuid",
    "nickname": "string",
    "photo_path": "string|null",
    "has_password": true,
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601"
  },
  "history": [],
  "favorites": [],
  "downloads": [],
  "password_vault": [],
  "preferences": {
    "themeMode": "dark|light|system",
    "settingsAUTO": {},
    "autotuneFactorySettings": {},
    "customiseSettings": {},
    "sessionTabs": {},
    "perfSettings": {},
    "shortcutBindings": {}
  },
  "wallpaper": {
    "type": "image|video",
    "relativeMediaPath": "wallpaper.ext",
    "transform": {}
  }
}
```

Notas:

- `password_hash` / `password_salt` / plaintext de vault **nunca** entram no bundle sem re-criptografia com senha fornecida no momento do export.
- `preferences` espelha as chaves locais `dsx.u.{userId}.*`.
- Import futuro deve gerar novo `id` se houver colisão de nickname, ou exigir rename.
