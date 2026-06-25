# Favoritos/ — Lista de favoritos

**Caminho:** `Frontend/src/Favoritos/`

---

## Responsabilidade

CRUD de favoritos (título + URL) com persistência em `localStorage`. Tela overlay + preview no menu principal.

---

## Estrutura

```
Favoritos/
├── constants.js        ← FAVORITOS_STORAGE_KEY = 'dragon-favoritos-v1'
├── Favoritos.html      ← Form + lista
├── Favoritos.css
├── Favoritos.js        ← CRUD, open/close, loadPreview
└── Favoritos.anim.js   ← Classes is-open no overlay
```

---

## API pública

```js
window.FAVORITOS_STORAGE_KEY  // 'dragon-favoritos-v1'
window.Favoritos = {
  open(),
  close(),
  loadPreview(),   // DOM para preview no Menu
  loadAll(),
  add(title, url)
}
```

---

## Integração

| Entrada | Módulo |
|---------|--------|
| Menu → Favoritos | `Top/Menu/Menu.js` → `Favoritos.open()` |
| Preview no menu | `Menu.js` → `Favoritos.loadPreview()` |
| Abrir favorito | Click na lista → `createTab(url, title)` |

---

## Persistência

Chave: `dragon-favoritos-v1` (alterar em `constants.js`).

Formato JSON:

```json
[{ "id": "fav-123", "title": "...", "url": "https://...", "createdAt": "..." }]
```

**Migrar dados:** ler chave antiga e gravar na nova em `Favoritos.js` → `loadAll()`.

---

## Como mudar comportamento

| Objetivo | Arquivo |
|----------|---------|
| Campos do formulário | `Favoritos.html` + `handleSubmit()` em `Favoritos.js` |
| Limite do preview no menu | `PREVIEW_LIMIT` em `Favoritos.js` |
| Estilo da lista | `Favoritos.css` |
| Animação abrir/fechar | `Favoritos.anim.js` |
| Sincronizar com API futura | substituir `loadAll`/`saveAll` em `Favoritos.js` |

---

## Favoritos.anim.js

Toggle classes `is-open` / `aria-hidden` no overlay.

**Mudar para slide em vez de fade:** editar CSS do overlay + anim.js se necessário.
