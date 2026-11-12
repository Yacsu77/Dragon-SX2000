# Como traduzir o DSX

As três línguas nativas são inglês (`en`), português (`pt`) e espanhol (`es`). Elas acompanham cada versão do navegador e precisam ter todas as frases. Qualquer outro idioma é da comunidade: pode chegar incompleto. A frase que faltar continua em inglês até a lista ser atualizada.

O arquivo principal é `catalogo.json`. Ele agrupa as frases por seção (topo, home, abas, lateral, autotune, menu, gate, histórico, e as demais). O valor em cada chave é a frase em inglês, a referência.

As listas que o navegador lê ficam em `listas/`. O nome do arquivo é o código do idioma: `en.json`, `pt.json`, `es.json`. Cada uma é um objeto simples:

```json
{
  "topo.voltar": "Voltar"
}
```

A chave é `secao.nome`, igual à do catálogo. Não traduza a chave. Traduza só o valor.

## Traduzir para o seu idioma

1. Copie `listas/en.json`.
2. Salve a cópia como `listas/<codigo>.json`. Use o código curto do idioma, em minúsculas, por exemplo `fr.json` ou `de.json`.
3. Traduza cada valor. Mantenha todas as chaves, nesta mesma ordem ou em outra: a ordem não importa.
4. Não deixe valor vazio. Não use o caractere de substituição (`�`).
5. Conserve pontuação que faz parte da interface, como `…`, `?` e `https://...` quando a frase for um exemplo de endereço.
6. Nomes próprios do app podem ficar como estão: DSX, Dragon SX2000, AutoTune, Share, Donate, Picture in Picture.

Se uma chave não existir na sua lista, o navegador mostra a frase em inglês daquela chave. O restante da sua lista continua valendo. Se o arquivo não abrir (JSON inválido), a sessão inteira fica em inglês.

Datas e números ainda aparecem em português até os menus passarem a usar estas listas. Isso está anotado na chave `sessao.notaDatas`.

## O que a versão confere

Na branch de idiomas, antes de um commit seguir para a próxima versão, as três listas nativas passam por `Tests/i18n/validar.js`:

```bash
node Tests/i18n/validar.js
```

Ele confere se o JSON abre, se `en`, `pt` e `es` têm exatamente as chaves do catálogo, se `en.json` repete as frases do catálogo, e se nenhuma frase está vazia ou com caractere inválido. Uma lista da comunidade não entra nessa cobrança de lista completa.

O carregamento acontece uma vez, no início da sessão. Trocar o idioma lê só a lista nova, também uma vez.
