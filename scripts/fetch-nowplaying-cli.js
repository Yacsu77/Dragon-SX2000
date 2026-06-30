/**
 * Baixa e compila nowplaying-cli v2.1.0 para o SDK (macOS).
 *
 * Saída:
 *   Backend/SDK/bin/darwin-{arch}/
 *     nowplaying-cli
 *     lib/nowplaying-cli/MediaRemoteMini.dylib
 *     share/nowplaying-cli/scripts/mediaremote-mini.pl
 *
 * O binário procura dylib/script relativos ao próprio diretório.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const https = require('https');

const ROOT = path.join(__dirname, '..');
const VERSION = 'v2.1.0';
const REPO_TARBALL = `https://github.com/kirtan-shah/nowplaying-cli/archive/refs/tags/${VERSION}.tar.gz`;

function parseArgs(argv) {
  const opts = { arch: process.arch, force: false };
  for (const arg of argv.slice(2)) {
    if (arg === '--force') opts.force = true;
    else if (arg.startsWith('--arch=')) opts.arch = arg.split('=')[1];
  }
  return opts;
}

function darwinArch(arch) {
  if (arch === 'arm64') return 'arm64';
  if (arch === 'x64' || arch === 'x86_64') return 'x64';
  throw new Error(`Arquitetura não suportada para nowplaying-cli: ${arch}`);
}

function run(cmd, args, opts = {}) {
  const result = spawnSync(cmd, args, {
    stdio: 'inherit',
    ...opts,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`Comando falhou (${result.status}): ${cmd} ${args.join(' ')}`);
  }
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const request = (targetUrl) => {
      https.get(targetUrl, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          request(res.headers.location);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`Download falhou (${res.statusCode}): ${targetUrl}`));
          res.resume();
          return;
        }
        res.pipe(file);
        file.on('finish', () => file.close(() => resolve()));
      }).on('error', reject);
    };
    request(url);
  });
}

function probeBinary(binaryPath) {
  const result = spawnSync(binaryPath, ['--help'], { encoding: 'utf8' });
  return !result.error && (result.status === 0 || result.status === 1);
}

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
  fs.chmodSync(dest, 0o755);
}

async function main() {
  if (process.platform !== 'darwin') {
    console.log('[nowplaying-cli] ignorado: apenas macOS');
    return;
  }

  const { arch: rawArch, force } = parseArgs(process.argv);
  const arch = darwinArch(rawArch);
  const outDir = path.join(ROOT, 'Backend', 'SDK', 'bin', `darwin-${arch}`);
  const binaryPath = path.join(outDir, 'nowplaying-cli');
  const dylibPath = path.join(outDir, 'lib', 'nowplaying-cli', 'MediaRemoteMini.dylib');
  const scriptPath = path.join(outDir, 'share', 'nowplaying-cli', 'scripts', 'mediaremote-mini.pl');

  if (!force && fs.existsSync(binaryPath) && fs.existsSync(dylibPath) && fs.existsSync(scriptPath)) {
    if (probeBinary(binaryPath)) {
      console.log(`[nowplaying-cli] já presente em ${outDir}`);
      return;
    }
    console.log('[nowplaying-cli] bundle incompleto ou inválido, recompilando...');
  }

  const tmpBase = fs.mkdtempSync(path.join(os.tmpdir(), 'nowplaying-cli-'));
  const tarball = path.join(tmpBase, 'source.tar.gz');
  const extractDir = path.join(tmpBase, 'extract');
  fs.mkdirSync(extractDir, { recursive: true });

  try {
    console.log(`[nowplaying-cli] baixando ${VERSION}...`);
    await download(REPO_TARBALL, tarball);
    run('tar', ['-xzf', tarball, '-C', extractDir]);

    const entries = fs.readdirSync(extractDir);
    const sourceRoot = entries
      .map((name) => path.join(extractDir, name))
      .find((entry) => fs.statSync(entry).isDirectory());
    if (!sourceRoot) throw new Error('Diretório extraído não encontrado');

    console.log(`[nowplaying-cli] compilando para darwin-${arch}...`);
    const makeEnv = { ...process.env };
    if (arch === 'x64' && process.arch === 'arm64') {
      run('arch', ['-x86_64', 'make', 'clean'], { cwd: sourceRoot, env: makeEnv });
      run('arch', ['-x86_64', 'make'], { cwd: sourceRoot, env: makeEnv });
    } else {
      run('make', ['clean'], { cwd: sourceRoot, env: makeEnv });
      run('make', [], { cwd: sourceRoot, env: makeEnv });
    }

    const builtBinary = path.join(sourceRoot, 'nowplaying-cli');
    const builtDylib = path.join(sourceRoot, 'build', 'mediaremote-mini', 'MediaRemoteMini.dylib');
    const builtScript = path.join(sourceRoot, 'scripts', 'mediaremote-mini.pl');

    for (const file of [builtBinary, builtDylib, builtScript]) {
      if (!fs.existsSync(file)) {
        throw new Error(`Artefato de build não encontrado: ${file}`);
      }
    }

    fs.rmSync(outDir, { recursive: true, force: true });
    fs.mkdirSync(outDir, { recursive: true });

    copyFile(builtBinary, binaryPath);
    copyFile(builtDylib, dylibPath);
    copyFile(builtScript, scriptPath);

    if (!probeBinary(binaryPath)) {
      throw new Error(`Binário compilado não respondeu: ${binaryPath}`);
    }

    console.log(`[nowplaying-cli] instalado em ${outDir}`);
  } finally {
    fs.rmSync(tmpBase, { recursive: true, force: true });
  }
}

main().catch((err) => {
  console.error('[nowplaying-cli] erro:', err.message);
  process.exit(1);
});
