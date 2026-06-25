# Banco de Dados — API-DSX

Documentação técnica sobre a camada de persistência e cache da API local do Dragon SX2000.

---

## SQLite — Armazenamento Persistente

### Por que usar SQLite?

O SQLite foi escolhido como banco de dados local porque:

- **Leve e embarcado**: não requer servidor externo, ideal para aplicações desktop Electron.
- **Persistência local**: os dados do histórico de navegação permanecem no disco do usuário entre sessões.
- **Zero configuração**: o arquivo `.db` é criado automaticamente na primeira execução.
- **Confiável**: amplamente utilizado em aplicações locais e mobile.

### Localização do arquivo

O banco SQLite é salvo em:

```
Backend/API-DSX/DB/dsx-browser.db
```

---

## Redis — Cache de Sessão

### Por que usar Redis?

O Redis é utilizado exclusivamente como **cache temporário** da sessão ativa do usuário:

- **Performance**: evita consultas repetidas ao SQLite durante a navegação.
- **Dados voláteis**: informações de sessão que não precisam persistir após o fechamento do app.
- **TTL configurável**: entradas de cache expiram automaticamente (padrão: 300 segundos).

### Redis é opcional

Se o Redis não estiver disponível ou offline, a API **continua funcionando normalmente** utilizando apenas o SQLite. O cache é uma otimização, não uma dependência crítica.

### Uso do cache de sessão

| Chave | Conteúdo | TTL |
|---|---|---|
| `session:history:default` | Lista completa do histórico (sem filtro de perfil) | 300s |
| `session:history:{profile_id}` | Histórico filtrado por perfil | 300s |

O cache é invalidado automaticamente quando:

- Um novo registro é criado ou atualizado
- Um registro é removido
- O histórico é limpo

---

## Diferença: Persistente vs Cache

| Aspecto | SQLite | Redis |
|---|---|---|
| **Propósito** | Armazenamento permanente | Cache temporário de sessão |
| **Duração** | Persiste entre reinicializações | Expira após TTL ou invalidação |
| **Obrigatório** | Sim | Não |
| **Dados** | Histórico completo de navegação | Listagens recentes em cache |

---

## Tabela `browser_history`

### Estrutura SQL

```sql
CREATE TABLE IF NOT EXISTS browser_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  url TEXT NOT NULL,
  title TEXT,
  visit_count INTEGER DEFAULT 1,
  typed_count INTEGER DEFAULT 0,
  last_visit_time DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  favicon_url TEXT,
  transition_type TEXT,
  referrer_url TEXT,
  profile_id TEXT
);
```

### Índices

```sql
CREATE INDEX IF NOT EXISTS idx_browser_history_url ON browser_history(url);
CREATE INDEX IF NOT EXISTS idx_browser_history_profile_id ON browser_history(profile_id);
CREATE INDEX IF NOT EXISTS idx_browser_history_last_visit_time ON browser_history(last_visit_time);
```

### Campos

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | INTEGER | Identificador único auto-incrementado |
| `url` | TEXT | URL visitada (obrigatório) |
| `title` | TEXT | Título da página visitada |
| `visit_count` | INTEGER | Quantidade de visitas à URL (padrão: 1) |
| `typed_count` | INTEGER | Quantidade de vezes que a URL foi digitada na barra de endereço |
| `last_visit_time` | DATETIME | Data/hora da última visita |
| `created_at` | DATETIME | Data/hora de criação do registro |
| `favicon_url` | TEXT | URL do favicon da página |
| `transition_type` | TEXT | Tipo de transição (ex: `link`, `typed`, `reload`) |
| `referrer_url` | TEXT | URL de origem da navegação |
| `profile_id` | TEXT | Identificador do perfil do usuário |

---

<p align="center">
  <sub>Dragon SX2000 — API-DSX — Documentação de Banco de Dados</sub>
</p>
