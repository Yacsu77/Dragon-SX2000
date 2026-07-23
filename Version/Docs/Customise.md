# Customise — catálogo e Factory por componentes

**Caminho:** `UserINTer/Tabline/idget/Customise/`

Painel de personalização da UI (sem toggle on/off). Cada linha do catálogo abre um **editor** via Factory Method. Persistência e runtimes externos passam por **Adapters**.

---

## Por que essa estrutura

O antigo `index.js` (~1100 linhas) misturava Radial, Search Palette e Topo Global. Agora cada objeto tem pasta própria; o shell só orquestra.

---

## Mapa de pastas

```
Customise/
├── catalog.html              ← Markup do painel (montado por Shell.js)
├── index.css                 ← Estilos do overlay + factory + topo mirror
├── index.js                  ← API pública window.Customise
├── core/
│   ├── keys.js               ← Chaves de storage
│   ├── utils.js              ← clamp, hex, escape, lucide
│   ├── store.js              ← getRecord / updateRecord (via adapters)
│   └── shell.js              ← Catálogo + overlay Factory
├── adapters/
│   ├── storageAdapter.js     ← UserStorage | localStorage
│   ├── runtimeAdapter.js     ← Notifica RadialMenu / SearchPalette / ChromeLayout
│   └── settingsAdapterRegistry.js  ← Registry de adapters por chave
├── factory/
│   ├── registry.js           ← EditorFactory.register / create
│   └── shared/
│       └── dragList.js       ← Reorder compartilhado
└── components/
    ├── radialMenu/           ← defaults, geometry, preview, editor
    ├── searchPalette/        ← defaults, preview, editor
    ├── smartSearch/          ← defaults, editor (painel da Busca Inteligente)
    └── topoGlobal/           ← defaults, meta, preview, editor
```

Namespace interno: `window.CustomiseNS`.

---

## Padrões

### Factory Method (`factory/registry.js`)

```js
CustomiseNS.EditorFactory.register(key, {
  label: '…',
  render(body, infoEl, ctx),
  teardown?.(body, ctx),   // opcional
});

// Shell:
const editor = EditorFactory.create(key);
editor.render(body, infoEl, { overlay, key, label });
```

Novo objeto no catálogo:

1. Criar `components/meuObjeto/` (defaults + editor + preview se precisar)
2. Registrar settings adapter + `EditorFactory.register`
3. Incluir scripts na ordem em `Tabline.js`
4. Adicionar linha em `catalog.html` com `data-customise-key`

### Adapter

| Adapter | Função |
|---------|--------|
| `StorageAdapter` | Isola UserStorage vs localStorage |
| `SettingsAdapterRegistry` | Cada chave sabe ler/gravar (Radial/Search no `customiseSettings`; Topo via `ChromeLayoutSettings`) |
| `RuntimeAdapter` | Emite `customise:settings-changed` e chama `.reload()` / `.apply()` dos módulos |

O store **não** importa RadialMenu nem ChromeLayout diretamente.

---

## API pública (`window.Customise`)

```js
Customise.open()
Customise.close()
Customise.openFactory({ key, label })
Customise.closeFactory()
Customise.getRecord(key)
Customise.updateRecord(key, patch)
Customise.reloadFromStorage()
Customise.NS   // namespace interno
```

Eventos: `customise:settings-changed`, `customise:reloaded`.

---

## Chaves

| Chave | Componente |
|-------|------------|
| `customise-radial-menu` | Radial Menu |
| `customise-search-palette` | Search Palette |
| `dragonsx.chrome.layout` | Layout Topo Global |
| `dragonsx.smart-search` | Buscadores (Busca Inteligente) |
| `sidebar.layout` | Barra Lateral |
| `dragonsx.janelas` | Janelas (layouts / multi / animações) |

---

## Ordem de scripts (`Tabline.js`)

`core/keys → utils → adapters → store → factory → components/* → shell → index.js`

---

## Ver também

- [`Top.MD`](./Frontend/Top.MD) — ChromeLayout / Topo Global
- [`Autotune.md`](./Autotune.md) — Music positions via Topo
- [`BuscaInteligente.md`](./BuscaInteligente.md) — editor Buscadores (`dragonsx.smart-search`)
- [`Janelas.MD`](./Frontend/Janelas.MD) — Multijanelas, split, detach, Customise Janelas
- [`Log v1.4.MD`](../Lançamento/Log%20v1.4.MD)
