# Dragon SX2000 — Log de Lançamento

## Versão 1.1

| | |
|---|---|
| **Versão** | 1.1.0 |
| **Data de lançamento** | 20/08/2026 |
| **Plataforma** | Desktop (Electron) |

---

## O que foi implementado

### AutoTune — Widget Clock

| Funcionalidade | Descrição |
|---|---|
| **Relógio personalizável** | Widget com hora, data e dia da semana em elementos independentes |
| **Posicionamento livre** | Cada elemento configurável em X, Y, largura e altura |
| **Visibilidade individual** | Ativar ou desativar hora, data e dia da semana separadamente |
| **Tipografia por elemento** | Fonte, tamanho, peso, cor, transparência e alinhamento independentes |
| **Fundo configurável** | Cor, transparência, dimensões e bordas arredondadas |
| **Importação de fontes** | Suporte a `.otf`, `.ttf`, `.woff` e `.woff2` com persistência |
| **Persistência completa** | Layout, estilos e fontes restaurados ao reabrir a aplicação |

### Factory

| Funcionalidade | Descrição |
|---|---|
| **Stage 1 dedicada ao Clock** | Painel customizado com abas por elemento (Hora, Data, Dia da semana, Fundo) |
| **Sistema de plugins** | Suporte a `AutoTuneFactoryPlugins` para widgets com Stage 1 avançada |

### Documentação

| Arquivo | Descrição |
|---|---|
| **Factory.md** | Funcionamento do Factory, Stage 1/2 e `CUSTOM_CONFIG` |
| **Autotune.md** | Estrutura de pastas e fluxo para widgets aparecerem na tela |
| **NewComponet.md** | Passo a passo para criar um novo widget do zero até o Factory |

### Histórico de Navegação — API-DSX

Iniciada a implementação do módulo de histórico de navegação.

- Criada estrutura inicial da API local API-DSX
- Adicionada configuração base com Node.js e Express
- Adicionada estrutura SQLite para histórico de navegação
- Adicionada configuração inicial para Redis como cache de sessão
- Criada estrutura de pastas Controller, Services, DTO, routes, DB, Exceptions e Docs
- Criadas documentações iniciais DB.md e Historico.md
- Criadas rotas iniciais para CRUD do histórico de navegação

---

<p align="center">
  <sub>Dragon SX2000 1.1 — © Pedro Henrique Carneichuk Rosa</sub>
</p>
