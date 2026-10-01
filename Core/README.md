# dsx-core (C)

Daemon nativo do DSX planejado para a v1.5 — substitui `Backend/API-DSX` e `Backend/SDK`.
Plano completo: [`Version/Planejamento/Plano v1.5.MD`](../Version/Planejamento/Plano%20v1.5.MD) (Etapa 1).

## Estado

**Etapa 0 — esqueleto de toolchain.** Só existe o "hello daemon" (`--version`, `--health`) para validar CMake + compilador nos três sistemas no CI (`core-build` em `.github/workflows/*.yml`). Nenhum servidor sobe ainda; o app continua usando o backend Node.

## Build local

```bash
npm run core:build     # cmake -S Core -B Core/build && cmake --build
npm run core:test      # ctest
Core/build/bin/dsx-core --health
```

Requisitos: CMake ≥ 3.24 e um compilador C11 (clang no macOS, gcc/clang no Linux, MSVC ou clang-cl no Windows). Warnings são erro (`-Wall -Wextra -Wpedantic -Wshadow -Wconversion -Werror` / `/W4 /WX`). `-DDSX_CORE_SANITIZERS=ON` liga ASan/UBSan em Debug.

## Layout previsto (Etapa 1)

```
Core/
├── CMakeLists.txt
├── src/
│   ├── main.c            ← args, sinais, loop
│   ├── http/             ← REST :3333 + WS :8974 (civetweb)
│   ├── db/               ← SQLite amalgamation, migrações, repositórios
│   ├── crypto/           ← scrypt, AES-256-GCM, Ed25519 (libsodium)
│   ├── domain/           ← users, history, favorites, downloads, vault, tabgroups
│   ├── search/           ← frecência + ranking (substitui Redis)
│   ├── media/{win,mac,linux}/
│   ├── store/  i18n/  translate/
├── third_party/          ← vendored: sqlite, civetweb, yyjson, libsodium
└── tests/                ← unitários em C + contrato (JS, golden da API Node)
```

Contratos a preservar (rotas, schema, crypto, eventos WS): seção 2.3 do plano.

## Testes já existentes (golden da API Node)

```bash
npm run test:crypto      # Core/tests/crypto — bytes de scrypt/AES que o C tem que reproduzir
npm run test:contract    # sobe a API-DSX numa porta livre com SQLite temporário
```

`vectors.json` documenta a pegadinha do salt: `hashSecret` passa a string hex (32 bytes ASCII); `deriveVaultKey` passa os 16 bytes decodificados.
