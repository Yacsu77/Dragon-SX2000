# AutoTune — grade fixa

Os AutoTunes da home ocupam células de uma grade. O tipo de encaixe é `fixo` ou `flutuante`. Nesta etapa só o `fixo` entra na tela. O `flutuante` fica no registro para um passo seguinte e não é montado.

## Grade

A área útil da home, abaixo da barra e das abas, é uma grade de **3 linhas por 4 colunas** (12 células), dentro de `#floating-cosmetics-root`.

| | |
|---|---|
| Colunas | 4 |
| Linhas | 3 |
| Tamanho da célula | `1fr`, definido no CSS |
| Borda | só no modo de edição, como guia |

Redimensionar a janela estica as células. Não há cálculo de `left`/`top` depois da montagem. A grade de vários monitores ainda não existe: o contrato de hoje é uma região. O passo futuro é repetir esta mesma grade em cada tela.

## Vãos

Cada AutoTune declara o vão em `window.AutoTuneWidgetMeta`. A âncora é o canto superior esquerdo. Dois fixos não dividem célula. Vão que sai da grade é recusado.

| AutoTune | Colunas | Linhas |
|---|---|---|
| Relógio | 2 | 1 |
| Lista | 1 | 2 |
| Timer | 1 | 1 |
| Share | 1 | 1 |
| Música | 1 | 1 |

A música é o card de uma célula, ligado ao Dragon Media SDK. A barra minimalista do topo não é mais montada.

## Modo de edição

O item AutoTune da lateral abre `#autotune-widget`. Esse painel é a prateleira: um preview de cada bloco, arrastável só com o painel aberto. Soltar grava a célula e monta o widget. Fora do modo de edição a soltura não grava.

Enquanto o bloco está na grade, o preview some da prateleira. No modo de edição o botão **Tirar** devolve o bloco à prateleira.

Um de cada id. A fusão do timer com a lista não existe mais.

## O que fica salvo

Chave `settingsAUTO`, versão 2. Posição antiga em pixels não é convertida: a grade começa vazia.

```json
{
  "version": 2,
  "items": [
    { "id": "clock", "placement": "fixo", "col": 0, "row": 0, "cols": 2, "rows": 1 }
  ]
}
```

`col` e `row` começam em 0. `placement: "flutuante"` pode estar na lista e é ignorado na montagem.

Na abertura, o motor lê essa lista uma vez e coloca cada fixo na célula. Não há listener de `resize` reescrevendo posição.

## Arquivos

```text
UserINTer/Tabline/idget/AutoTune/
├── catalog.html          prateleira de previews
├── index.js              grade, ocupação, gravação
├── index.css             prateleira, grade e blocos
├── Timer/index.js        1×1
├── Share/index.js        1×1
├── Tasklist/index.js     1×2
├── Music/index.js        1×1, SDK
└── Clock/                2×1
```

`Music/minimal.js` permanece no disco e não entra no carregamento da Tabline.

## O que um mod futuro declara

O motor lê `window.AutoTuneWidgetMeta[id]` e chama `window.AutoTuneWidgets[id](body)`. Um mod fixo precisa disto:

```javascript
window.AutoTuneWidgetMeta.notas = {
  title: "Notas",
  placement: "fixo",
  cols: 1,
  rows: 1
};

window.AutoTuneWidgets.notas = function initNotas(bodyEl) {
  bodyEl.textContent = "Notas";
};
```

`placement: "flutuante"` fica reservado. O motor recusa colocá-lo na grade. Ainda não há carregador de pacote nem loja: o formato da célula já aceita um id que não seja um dos cinco atuais.

## API da página

| Chamada | Efeito |
|---|---|
| `AutoTune.place(id, col, row)` | Grava e monta, só em modo de edição |
| `AutoTune.remove(id)` | Tira da grade, só em modo de edição |
| `AutoTune.getSettings()` | Lê `settingsAUTO` v2 |
| `AutoTune.reloadFromStorage()` | Remonta a grade a partir do que está salvo |
| `AutoTune.grid` | `{ cols: 4, rows: 3 }` |
