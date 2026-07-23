# Histórico de Navegação — API-DSX

Documentação das rotas e regras de negócio do módulo de histórico de navegação.

---

## Objetivo

O módulo de histórico de navegação registra, consulta e gerencia todas as URLs visitadas pelo usuário no Dragon SX2000. Os dados são persistidos localmente via SQLite e complementados por cache Redis para a sessão ativa.

**Base URL:** `http://localhost:3333`

---

## Rotas

### POST `/history`

Cria um novo registro ou atualiza um existente (mesma URL + mesmo `profile_id`).

**Corpo da requisição:**

```json
{
  "url": "https://example.com",
  "title": "Example Domain",
  "favicon_url": "https://example.com/favicon.ico",
  "transition_type": "link",
  "referrer_url": "https://google.com",
  "profile_id": "default",
  "typed_count": 0
}
```

| Campo | Obrigatório | Padrão | Descrição |
|---|---|---|---|
| `url` | Sim | — | URL visitada |
| `title` | Não | `null` | Título da página |
| `favicon_url` | Não | `null` | URL do favicon |
| `transition_type` | Não | `link` | Tipo de transição |
| `referrer_url` | Não | `null` | URL de origem |
| `profile_id` | Não | `null` | ID do perfil |
| `typed_count` | Não | `0` | Contagem de digitação |

**Resposta de sucesso (201):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com",
    "title": "Example Domain",
    "visit_count": 1,
    "typed_count": 0,
    "last_visit_time": "2026-06-19T12:00:00.000Z",
    "created_at": "2026-06-19T12:00:00.000Z",
    "favicon_url": "https://example.com/favicon.ico",
    "transition_type": "link",
    "referrer_url": "https://google.com",
    "profile_id": "default"
  }
}
```

---

### GET `/history`

Lista todo o histórico, ordenado por `last_visit_time` decrescente.

**Query params opcionais:**

| Param | Descrição |
|---|---|
| `profile_id` | Filtra por perfil específico |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "url": "https://example.com",
      "title": "Example Domain",
      "visit_count": 3,
      "typed_count": 0,
      "last_visit_time": "2026-06-19T14:00:00.000Z",
      "created_at": "2026-06-19T12:00:00.000Z",
      "favicon_url": null,
      "transition_type": "link",
      "referrer_url": null,
      "profile_id": "default"
    }
  ]
}
```

---

### GET `/history/search?q=`

Pesquisa no histórico por URL ou título.

**Query params:**

| Param | Obrigatório | Descrição |
|---|---|---|
| `q` | Sim | Termo de busca |
| `profile_id` | Não | Filtra por perfil |

**Exemplo:** `GET /history/search?q=example&profile_id=default`

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": []
}
```

---

### GET `/history/suggestions?q=`

Sugestões da **Busca Inteligente**: combina histórico (frecência), logins salvos
no Vault, sessões ativas e sugestões do Google numa única resposta.

**Query params:**

| Param | Obrigatório | Descrição |
|---|---|---|
| `q` | Sim | Termo digitado |
| `user_id` | Não | Perfil ativo (usado para ranking/logins) |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "sites": [
      { "type": "history", "url": "https://youtube.com", "title": "YouTube", "visit_count": 42, "has_saved_login": false }
    ],
    "google": ["youtube", "youtube music", "youtube studio"]
  }
}
```

| Campo | Descrição |
|---|---|
| `sites` | Até 2 sites, os mais acessados (frecência; login salvo desempata) |
| `google` | 5 sugestões se houver `sites`, senão 7 — via `client=gws-wiz` (fallback `client=chrome`) |

**Ranking (frecência + Redis):** o serviço mantém um `ZSET` Redis por usuário
(`smart-search:rank:{userId}`) para acelerar as URLs mais usadas. Sem Redis, o
ranking cai para SQLite/memória. URLs de páginas de resultado de busca são
filtradas das sugestões de sites.

**Arquivo:** `Services/historyService.js` (`smartSuggestions`, `googleSuggestions`).

---

### GET `/history/:id`

Busca um registro específico pelo ID.

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "url": "https://example.com",
    "title": "Example Domain",
    "visit_count": 1,
    "typed_count": 0,
    "last_visit_time": "2026-06-19T12:00:00.000Z",
    "created_at": "2026-06-19T12:00:00.000Z",
    "favicon_url": null,
    "transition_type": "link",
    "referrer_url": null,
    "profile_id": "default"
  }
}
```

**Resposta de erro (404):**

```json
{
  "success": false,
  "message": "Registro de histórico não encontrado"
}
```

---

### DELETE `/history/:id`

Remove um registro específico.

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "id": 1,
    "deleted": true
  }
}
```

---

### DELETE `/history`

Limpa todo o histórico.

**Query params opcionais:**

| Param | Descrição |
|---|---|
| `profile_id` | Limpa apenas o histórico do perfil informado |

**Resposta de sucesso (200):**

```json
{
  "success": true,
  "data": {
    "deleted": 5
  }
}
```

---

## Regras de Negócio

### Atualização de `visit_count`

Quando uma URL já existe para o mesmo `profile_id`:

1. `visit_count` é incrementado em 1
2. `last_visit_time` é atualizado para o momento atual
3. `typed_count` é somado ao valor enviado na requisição
4. Campos opcionais (`title`, `favicon_url`, etc.) são atualizados se enviados

Quando a URL é nova:

1. Um novo registro é criado com `visit_count = 1`
2. `created_at` e `last_visit_time` recebem a data/hora atual

### Limpeza de histórico

- `DELETE /history` sem `profile_id`: remove **todos** os registros
- `DELETE /history?profile_id=default`: remove apenas registros do perfil informado
- Após limpeza, o cache Redis é invalidado automaticamente

### Ordenação

Todas as listagens retornam registros ordenados por `last_visit_time` em ordem **decrescente** (mais recentes primeiro).

### Frecência (Busca Inteligente)

O `frecencyScore` pondera **frequência** (`visit_count`, `typed_count`) e
**recência** (`last_visit_time`) para ordenar as sugestões de sites. A rota
`/history/suggestions` usa esse score; o cliente frontend consome via
`HistoryApi.smartSuggestions`. Detalhes em [`BuscaInteligente.md`](../../../Version/Docs/BuscaInteligente.md).

---

## Respostas de Erro

Formato padrão:

```json
{
  "success": false,
  "message": "Descrição do erro"
}
```

| Código | Situação |
|---|---|
| 400 | Dados inválidos ou parâmetro ausente |
| 404 | Registro não encontrado |
| 500 | Erro interno do servidor |

---

<p align="center">
  <sub>Dragon SX2000 — API-DSX — Módulo de Histórico de Navegação</sub>
</p>
