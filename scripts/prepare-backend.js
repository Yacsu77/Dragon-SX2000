/**
 * Prepara Backend/API-DSX + Backend/SDK para o electron-builder.
 *
 * - Instala dependências de produção (omit=dev)
 * - Recompila nativos (sqlite3, etc.) para o ABI do Electron
 *
 * Uso:
 *   node scripts/prepare-backend.js
 *   node scripts/prepare-backend.js --arch=arm64
 *   node scripts/prepare-backend.js --skip-rebuild
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const ELECTRON_VERSION = require(path.join(ROOT, 'node_modules', 'electron', 'package.json')).version;

const API_DIR = path.join(ROOT, 'Backend', 'API-DSX');
const SDK_DIR = path.join(ROOT, 'Backend', 'SDK');

function parseArgs(argv) {
  const opts = { arch: process.arch, skipRebuild: false, rebuildOnly: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--skip-rebuild') opts.skipRebuild = true;
    else if (arg === '--rebuild-only') opts.rebuildOnly = true;
    else if (arg.startsWith('--arch=')) opts.arch = arg.split('=')[1];
  }
  if (opts.arch === 'x86_64') opts.arch = 'x64';
  return opts;
}

function run(cmd, args, opts = {}) {
  console.log(`[prepare-backend] $ ${cmd} ${args.join(' ')}`);
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    cwd: opts.cwd || ROOT,
    env: { ...process.env, ...(opts.env || {}) },
    shell: process.platform === 'win32',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Comando falhou (${result.status}): ${cmd} ${args.join(' ')}`);
  }
}

function npmInstall(dir) {
  const lock = path.join(dir, 'package-lock.json');
  const args = fs.existsSync(lock)
    ? ['ci', '--omit=dev', '--no-fund', '--no-audit']
    : ['install', '--omit=dev', '--no-fund', '--no-audit'];
  run('npm', args, { cwd: dir });
}

function assertDep(dir, pkgName) {
  const pkg = path.join(dir, 'node_modules', pkgName, 'package.json');
  if (!fs.existsSync(pkg)) {
    throw new Error(`Dependência ausente após install: ${path.relative(ROOT, pkg)}`);
  }
  console.log(`[prepare-backend] ok ${path.relative(ROOT, pkg)}`);
}

function rebuildNative(dir, arch) {
  const cli = path.join(ROOT, 'node_modules', '@electron', 'rebuild', 'lib', 'cli.js');
  if (fs.existsSync(cli)) {
    run(process.execPath, [
      cli,
      '-f',
      '-v',
      ELECTRON_VERSION,
      '-m',
      dir,
      '-a',
      arch,
    ]);
    return;
  }
  run('npx', [
    'electron-rebuild',
    '-f',
    '-v',
    ELECTRON_VERSION,
    '-m',
    dir,
    '-a',
    arch,
  ]);
}

function main() {
  const opts = parseArgs(process.argv);
  console.log(
    `[prepare-backend] Electron=${ELECTRON_VERSION} arch=${opts.arch} platform=${process.platform}`
  );

  if (!fs.existsSync(path.join(API_DIR, 'package.json'))) {
    throw new Error('Backend/API-DSX/package.json não encontrado');
  }
  if (!fs.existsSync(path.join(SDK_DIR, 'package.json'))) {
    throw new Error('Backend/SDK/package.json não encontrado');
  }

  console.log('[prepare-backend] instalando API-DSX…');
  if (!opts.rebuildOnly) {
    npmInstall(API_DIR);
  }
  assertDep(API_DIR, 'express');
  assertDep(API_DIR, 'sqlite3');
  assertDep(API_DIR, 'cors');
  assertDep(API_DIR, 'dotenv');

  console.log('[prepare-backend] instalando SDK…');
  if (!opts.rebuildOnly) {
    npmInstall(SDK_DIR);
  }
  assertDep(SDK_DIR, 'ws');

  if (!opts.skipRebuild) {
    console.log('[prepare-backend] rebuild nativos (API-DSX)…');
    try {
      rebuildNative(API_DIR, opts.arch);
    } catch (err) {
      console.warn('[prepare-backend] rebuild API avisou:', err.message);
      console.warn('[prepare-backend] seguindo com binários do npm install');
    }

    console.log('[prepare-backend] rebuild nativos (SDK)…');
    try {
      rebuildNative(SDK_DIR, opts.arch);
    } catch (err) {
      console.warn('[prepare-backend] rebuild SDK avisou:', err.message);
    }
  }

  const wallpapers = [
    path.join(ROOT, 'UserINTer', 'Tabline', 'idget', 'Wallpaper', 'WWP.jpg'),
    path.join(ROOT, 'UserINTer', 'Tabline', 'idget', 'Wallpaper', 'WWP1.png'),
    path.join(ROOT, 'UserINTer', 'Tabline', 'idget', 'Wallpaper', 'WWP3.jpg'),
  ];
  for (const file of wallpapers) {
    if (!fs.existsSync(file)) {
      throw new Error(`Wallpaper ausente no build: ${path.relative(ROOT, file)}`);
    }
    console.log(`[prepare-backend] wallpaper ok ${path.basename(file)}`);
  }

  console.log('[prepare-backend] concluído');
}

main();
