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
  "tab_groups": [],
  "preferences": {
    "themeMode": "dark|light|system",
    "settingsAUTO": {},
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
- `preferences` espelha as chaves locais `dsx.u.{userId}.*`. Visual de interface (Factory, Customise, layout do topo, sidebar e janelas) não entra: é constante no código. No boot, `UserStorage.purgeVisualKeys()` apaga `autotuneFactorySettings`, `customiseSettings`, `autotuneCustomFonts`, `autotuneCosmetics`, `dragonsx.chrome.layout`, `sidebar.layout` e `dragonsx.janelas`.
- `tab_groups` espelha as tabelas SQLite `tab_groups` + `tab_group_tabs` do usuário (v1.4).
- Import futuro deve gerar novo `id` se houver colisão de nickname, ou exigir rename.
