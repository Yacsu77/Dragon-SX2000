# Guia da suíte de testes

A suíte abre o DSX de verdade, cria um usuário novo e mede o que a interface faz. `npm start` não muda.

## Como rodar

```bash
npm run test:suite
```

Isso executa `electron test-main.js`. Esse arquivo carrega o `main.js` normal e depois o runner. É preciso rede: as abas e as janelas laterais abrem sites públicos.

O relatório sai em `Tests/reports/`, em JSON e em Markdown. Essa pasta não vai para o git.

## O que cada arquivo faz

| Arquivo | Função |
|---|---|
| `test-main.js` | Entrada do modo teste. Não entra no instalador. |
| `Tests/runner.js` | Espera a janela, cria o usuário, roda os testes e grava o relatório. |
| `Tests/lib/drive.js` | Coloca as ações dentro da janela e chama uma pelo nome. |
| `Tests/lib/clock.js` | Relógio e a espera de 2 segundos entre passos. |
| `Tests/page/actions.js` | O que a página faz: perfil, aba, painel, AutoTune, wallpaper, atalho, banco. |
| `Tests/probe/machine.js` | Modelo da máquina, CPU, RAM total e nome da GPU. |
| `Tests/probe/resources.js` | Amostras de RAM e CPU durante a suíte. |
| `Tests/report/writer.js` | Escreve o JSON e o Markdown. |
| `Tests/scenarios/boot.js` | Criação do usuário pelo formulário real. |
| `Tests/scenarios/tabs.js` | Teste 1, seis abas. |
| `Tests/scenarios/janelas.js` | Teste 2, lateral, divisão e nova janela. |
| `Tests/scenarios/autotune.js` | Teste 3, música, outros AutoTunes e wallpapers. |
| `Tests/scenarios/atalhos.js` | Teste 4, troca e restaura cada atalho. |
| `Tests/scenarios/banco.js` | Teste 5, tempo de cada operação no banco. |

## O que cada teste executa

O tempo da suíte começa quando o processo sobe, antes da janela.

1. **Arranque.** Até a janela carregar. Depois o formulário cria o perfil `suite-<número>`.
2. **Abas.** G1, um vídeo do YouTube, Krunker, Canva, Excalidraw e Wikipédia. Duas segundos entre uma e outra. Cada uma guarda o início e o fim do carregamento do webview.
3. **Janelas.** Liga o painel lateral sempre carregado e abre WhatsApp, Discord e Instagram. Divide a janela. Cria outra janela do app a partir de uma aba, pela mesma ponte que o detach usa.
4. **AutoTune e wallpaper.** Liga a música e manda pausar, avançar e voltar ao SDK. Liga e desliga timer, share, tarefas e relógio. Aplica WWP, WWP1 e WWP3.
5. **Atalhos.** Abre a tela de atalhos, troca cada combinação, dispara e devolve a tecla.
6. **Banco.** Cria, lista e apaga histórico, favorito, download, cofre e grupo de abas, e faz o flush da sessão. No fim apaga o usuário da suíte.

Se uma página não terminar em 45 segundos, aquele passo falha e a suíte continua.

## Relatório

Cada execução grava data, modelo da máquina, sistema, CPU, RAM total, nome da GPU, amostras de RAM e CPU, e a duração de cada teste e de cada passo. O uso percentual da GPU fica vazio quando o sistema não informa isso sem senha de administrador. O bloco `gates` está vazio para o controle de qualidade que ainda não existe.

## Fora da compilação

Não coloque teste dentro de `Frontend/`, `Main/` ou `UserINTer/`. O pacote só leva o que está em `build.files` no `package.json`. `test-main.js` e `Tests/**` estão excluídos. `npm run verify:build` falha se essa exclusão sumir.
