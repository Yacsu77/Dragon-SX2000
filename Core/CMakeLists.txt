cmake_minimum_required(VERSION 3.24)

# dsx-core — daemon nativo do DSX (v1.5, Etapa 1).
# Etapa 0: esqueleto de toolchain (hello daemon) para validar CMake nos 3 SOs.
# Plano: Version/Planejamento/Plano v1.5.MD

project(dsx-core
  VERSION 1.5.0
  DESCRIPTION "DSX Core daemon (API local, DB, SDK de midia)"
  LANGUAGES C)

set(CMAKE_C_STANDARD 11)
set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS OFF)

if(NOT CMAKE_BUILD_TYPE)
  set(CMAKE_BUILD_TYPE Release CACHE STRING "Build type" FORCE)
endif()

option(DSX_CORE_WERROR "Tratar warnings como erro" ON)
option(DSX_CORE_SANITIZERS "Habilitar ASan/UBSan (Linux/macOS, Debug)" OFF)

add_executable(dsx-core
  src/main.c
  src/version.c)

target_include_directories(dsx-core PRIVATE src)

target_compile_definitions(dsx-core PRIVATE
  DSX_CORE_VERSION="${PROJECT_VERSION}"
  DSX_CORE_PLATFORM="${CMAKE_SYSTEM_NAME}"
  DSX_CORE_ARCH="${CMAKE_SYSTEM_PROCESSOR}")

if(MSVC)
  target_compile_options(dsx-core PRIVATE /W4 /utf-8)
  if(DSX_CORE_WERROR)
    target_compile_options(dsx-core PRIVATE /WX)
  endif()
  target_compile_definitions(dsx-core PRIVATE _CRT_SECURE_NO_WARNINGS)
else()
  target_compile_options(dsx-core PRIVATE -Wall -Wextra -Wpedantic -Wshadow -Wconversion)
  if(DSX_CORE_WERROR)
    target_compile_options(dsx-core PRIVATE -Werror)
  endif()
  if(DSX_CORE_SANITIZERS)
    target_compile_options(dsx-core PRIVATE -fsanitize=address,undefined -fno-omit-frame-pointer)
    target_link_options(dsx-core PRIVATE -fsanitize=address,undefined)
  endif()
endif()

# Saída padronizada: Core/build/bin/dsx-core[.exe]
set_target_properties(dsx-core PROPERTIES
  RUNTIME_OUTPUT_DIRECTORY "${CMAKE_BINARY_DIR}/bin")

enable_testing()
add_test(NAME dsx-core-version COMMAND dsx-core --version)
add_test(NAME dsx-core-health COMMAND dsx-core --health)
set_tests_properties(dsx-core-health PROPERTIES PASS_REGULAR_EXPRESSION "\"engine\":\"dsx-core\"")

install(TARGETS dsx-core RUNTIME DESTINATION bin)
