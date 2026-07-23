/**
 * electron-builder beforePack — recompila nativos do Backend para a arch do pacote.
 * Assume que `npm run prepare:backend` / prebuild:* já instalou as deps.
 */
'use strict';

const path = require('path');
const { spawnSync } = require('child_process');

exports.default = async function beforePack(context) {
  const arch = context.arch === 1 ? 'x64' : context.arch === 3 ? 'arm64' : process.arch;
  const root = context.packager?.projectDir || path.join(__dirname, '..');
  const script = path.join(root, 'scripts', 'prepare-backend.js');

  console.log(`[beforePack] rebuild Backend nativos arch=${arch}`);
  const result = spawnSync(
    process.execPath,
    [script, '--rebuild-only', `--arch=${arch}`],
    {
      cwd: root,
      stdio: 'inherit',
      env: process.env,
    }
  );
  if (result.status !== 0) {
    throw new Error(`prepare-backend --rebuild-only falhou (exit ${result.status})`);
  }
};
