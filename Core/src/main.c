/*
 * dsx-core — ponto de entrada.
 *
 * Etapa 0 (v1.5): "hello daemon" que valida a toolchain C nos 3 SOs.
 * Não sobe servidor ainda. A Etapa 1 adiciona http/, db/, crypto/, media/.
 *
 * Uso:
 *   dsx-core --version   imprime a versão
 *   dsx-core --health    imprime o JSON que /health devolverá no daemon real
 *   dsx-core --serve     (Etapa 1) sobe o daemon — hoje apenas informa e sai com 2
 */
#include <stdio.h>
#include <string.h>

#include "version.h"

static void print_usage(FILE *out) {
    fprintf(out,
            "dsx-core %s\n"
            "  --version   versao do binario\n"
            "  --health    JSON de saude (mesmo formato de GET /health)\n"
            "  --serve     sobe o daemon (nao implementado na Etapa 0)\n",
            dsx_core_version());
}

static void print_health(void) {
    printf("{\"success\":true,\"engine\":\"dsx-core\",\"version\":\"%s\","
           "\"platform\":\"%s\",\"arch\":\"%s\",\"starting\":false,\"stage\":0}\n",
           dsx_core_version(), dsx_core_platform(), dsx_core_arch());
}

int main(int argc, char **argv) {
    if (argc < 2) {
        print_usage(stderr);
        return 1;
    }

    const char *cmd = argv[1];

    if (strcmp(cmd, "--version") == 0 || strcmp(cmd, "-v") == 0) {
        printf("dsx-core %s (%s/%s)\n", dsx_core_version(), dsx_core_platform(), dsx_core_arch());
        return 0;
    }

    if (strcmp(cmd, "--health") == 0) {
        print_health();
        return 0;
    }

    if (strcmp(cmd, "--serve") == 0) {
        fputs("dsx-core: --serve chega na Etapa 1 (HTTP/WS + SQLite + media).\n", stderr);
        return 2;
    }

    if (strcmp(cmd, "--help") == 0 || strcmp(cmd, "-h") == 0) {
        print_usage(stdout);
        return 0;
    }

    fprintf(stderr, "dsx-core: argumento desconhecido: %s\n", cmd);
    print_usage(stderr);
    return 1;
}
