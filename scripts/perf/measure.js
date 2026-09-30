#!/usr/bin/env node
/**
 * scripts/perf/measure.js — coleta o baseline de desempenho do DSX.
 *
 * Etapa 0 do plano v1.5 (Version/Planejamento/Plano v1.5.MD).
 * Métricas e metas: Version/Planejamento/Metas de Desempenho v1.5.MD.
 *
 * Uso:
 *   node scripts/perf/measure.js                 # estático + runtime (1 execução)
 *   node scripts/perf/measure.js --static        # só métricas estáticas (sem abrir o app)
 *   node scripts/perf/measure.js --runs 5        # mediana de 5 execuções do app
 *   node scripts/perf/measure.js --json out.json # grava resultado completo
 *   node scripts/perf/measure.js --md            # imprime linhas Markdown para o Baseline
 *   node scripts/perf/measure.js --idle 20000    # ms ocioso antes de coletar memória (default 15000)
 *
 * Runtime: abre o app com DSX_PERF_OUT; o main (Main/bootstrap/PerfProbe.js)
 * grava marcos de boot + app.getAppMetrics() + PIDs dos filhos e encerra.
 * Este script complementa com RSS dos filhos e contagem da árvore de processos.
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn, execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..', '..');
const args = parseArgs(process.argv.slice(2));

// ---------------------------------------------------------------------------
// util
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const out = { static: false, runs: 1, json: null, md: false, idle: 15000 };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--static') out.static = true;
    else if (a === '--md') out.md = true;
    else if (a === '--runs') out.runs = Math.max(1, Number(argv[++i]) || 1);
    else if (a === '--json') out.json = argv[++i];
    else if (a === '--idle') out.idle = Math.max(1000, Number(argv[++i]) || 15000);
    else if (a === '--help' || a === '-h') {
      console.log(fs.readFileSync(__filename, 'utf8').split('\n').slice(1, 20).join('\n'));
      process.exit(0);
    }
  }
  return out;
}

function walk(dir, opts, acc = []) {
  let entries;
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return acc;
  }
  for (const e of entries) {
    if (e.name === '.git') continue;
    if (!opts.includeNodeModules && e.name === 'node_modules') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) walk(full, opts, acc);
    else if (e.isFile()) acc.push(full);
  }
  return acc;
}

function countLines(file) {
  try {
    return fs.readFileSync(file, 'utf8').split('\n').length;
  } catch {
    return 0;
  }
}

function locOf(relDir, exts = ['.js', '.css', '.html']) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) return { files: 0, lines: 0 };
  const files = walk(dir, { includeNodeModules: false }).filter((f) => exts.includes(path.extname(f)));
  return { files: files.length, lines: files.reduce((n, f) => n + countLines(f), 0) };
}

function dirSize(relDir) {
  const dir = path.join(ROOT, relDir);
  if (!fs.existsSync(dir)) return { files: 0, bytes: 0 };
  const files = walk(dir, { includeNodeModules: true });
  let bytes = 0;
  for (const f of files) {
    try {
      bytes += fs.statSync(f).size;
    } catch {
      /* ignore */
    }
  }
  return { files: files.length, bytes };
}

function mb(bytes) {
  return Math.round((bytes / (1024 * 1024)) * 10) / 10;
}

function median(nums) {
  const arr = nums.filter((n) => typeof n === 'number' && !Number.isNaN(n)).sort((a, b) => a - b);
  if (!arr.length) return null;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : Math.round((arr[mid - 1] + arr[mid]) / 2);
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

// ---------------------------------------------------------------------------
// métricas estáticas
// ---------------------------------------------------------------------------

function staticMetrics() {
  const pkg = readJson(path.join(ROOT, 'package.json'));
  const indexHtml = fs.readFileSync(path.join(ROOT, 'Frontend/src/index.html'), 'utf8');
  const tabline = fs.readFileSync(path.join(ROOT, 'Frontend/src/Tabline/Tabline.js'), 'utf8');

  const scriptTags = (indexHtml.match(/<script\s+src=/g) || []).length;
  const styleLinks = (indexHtml.match(/<link\s+rel="stylesheet"/g) || []).length;
  const widgetBlock = tabline.match(/WIDGET_SCRIPTS\s*=\s*\[([\s\S]*?)\];/);
  const dynamicScripts = widgetBlock
    ? (widgetBlock[1].match(/['"`]/g) || []).length / 2
    : 0;

  const manifestCss = path.join(ROOT, 'Frontend/src/core/manifest.css');
  const cssImports = fs.existsSync(manifestCss)
    ? (fs.readFileSync(manifestCss, 'utf8').match(/@import/g) || []).length
    : 0;

  const areas = {
    'Frontend/src': locOf('Frontend/src'),
    'Frontend/Telas': locOf('Frontend/Telas'),
    'Frontend/MiniTelas': locOf('Frontend/MiniTelas'),
    'UserINTer/Factory': locOf('UserINTer/Factory'),
    'UserINTer/Tabline/idget/Customise': locOf('UserINTer/Tabline/idget/Customise'),
    'UserINTer/Tabline/idget/AutoTune': locOf('UserINTer/Tabline/idget/AutoTune'),
    'UserINTer (total)': locOf('UserINTer'),
    Main: locOf('Main', ['.js']),
    MediaDrm: locOf('MediaDrm', ['.js']),
    'Backend/API-DSX (fonte)': locOf('Backend/API-DSX', ['.js']),
    'Backend/SDK (fonte)': locOf('Backend/SDK', ['.js']),
  };

  const editorLayer =
    areas['UserINTer/Factory'].lines +
    areas['UserINTer/Tabline/idget/Customise'].lines +
    countLines(path.join(ROOT, 'UserINTer/Tabline/idget/AutoTune/Clock/factory.js'));

  const backendNodeModules = {
    'Backend/API-DSX/node_modules': dirSize('Backend/API-DSX/node_modules'),
    'Backend/SDK/node_modules': dirSize('Backend/SDK/node_modules'),
  };

  const backendDeps = {};
  for (const rel of ['Backend/API-DSX/package.json', 'Backend/SDK/package.json']) {
    try {
      const p = readJson(path.join(ROOT, rel));
      backendDeps[rel] = Object.keys(p.dependencies || {}).concat(
        Object.keys(p.optionalDependencies || {})
      );
    } catch {
      backendDeps[rel] = [];
    }
  }

  const releaseDir = path.join(ROOT, 'release');
  const installers = fs.existsSync(releaseDir)
    ? fs
        .readdirSync(releaseDir)
        .filter((f) => /\.(exe|dmg|deb|AppImage)$/i.test(f))
        .map((f) => ({ file: f, mb: mb(fs.statSync(path.join(releaseDir, f)).size) }))
    : [];

  return {
    version: pkg.version,
    electron: (pkg.devDependencies && pkg.devDependencies.electron) || null,
    renderer: {
      scriptTagsIndexHtml: scriptTags,
      styleLinks,
      cssImportsInManifest: cssImports,
      dynamicScriptsTabline: dynamicScripts,
      totalScriptsBoot: scriptTags + dynamicScripts,
      bundler: 'nenhum',
    },
    loc: areas,
    editorLayerLines: editorLayer,
    backendNodeModules: Object.fromEntries(
      Object.entries(backendNodeModules).map(([k, v]) => [k, { files: v.files, mb: mb(v.bytes) }])
    ),
    backendDeps,
    installers,
  };
}

// ---------------------------------------------------------------------------
// métricas de runtime
// ---------------------------------------------------------------------------

function electronBin() {
  const bin = process.platform === 'win32' ? 'electron.cmd' : 'electron';
  const local = path.join(ROOT, 'node_modules', '.bin', bin);
  return fs.existsSync(local) ? local : bin;
}

function processTree(rootPid) {
  // Retorna PIDs descendentes (todas as gerações) do processo raiz.
  const out = new Set();
  try {
    if (process.platform === 'win32') {
      const ps = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', 'Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId | ConvertTo-Json -Compress'],
        { encoding: 'utf8' }
      );
      const list = JSON.parse(ps);
      const byParent = new Map();
      for (const p of list) {
        if (!byParent.has(p.ParentProcessId)) byParent.set(p.ParentProcessId, []);
        byParent.get(p.ParentProcessId).push(p.ProcessId);
      }
      const stack = [rootPid];
      while (stack.length) {
        const pid = stack.pop();
        for (const c of byParent.get(pid) || []) {
          if (!out.has(c)) {
            out.add(c);
            stack.push(c);
          }
        }
      }
    } else {
      const ps = execFileSync('ps', ['-eo', 'pid=,ppid='], { encoding: 'utf8' });
      const byParent = new Map();
      for (const line of ps.trim().split('\n')) {
        const [pid, ppid] = line.trim().split(/\s+/).map(Number);
        if (!byParent.has(ppid)) byParent.set(ppid, []);
        byParent.get(ppid).push(pid);
      }
      const stack = [rootPid];
      while (stack.length) {
        const pid = stack.pop();
        for (const c of byParent.get(pid) || []) {
          if (!out.has(c)) {
            out.add(c);
            stack.push(c);
          }
        }
      }
    }
  } catch {
    /* ignore */
  }
  return Array.from(out);
}

function rssKB(pid) {
  try {
    if (process.platform === 'win32') {
      const ps = execFileSync(
        'powershell.exe',
        ['-NoProfile', '-Command', `(Get-Process -Id ${pid}).WorkingSet64`],
        { encoding: 'utf8' }
      );
      return Math.round(Number(ps.trim()) / 1024);
    }
    const ps = execFileSync('ps', ['-o', 'rss=', '-p', String(pid)], { encoding: 'utf8' });
    return Number(ps.trim()) || null;
  } catch {
    return null;
  }
}

function runOnce(idx) {
  return new Promise((resolve) => {
    const outFile = path.join(os.tmpdir(), `dsx-perf-${process.pid}-${idx}.json`);
    try {
      fs.unlinkSync(outFile);
    } catch {
      /* ignore */
    }

    const env = {
      ...process.env,
      DSX_PERF_OUT: outFile,
      DSX_PERF_DURATION_MS: String(args.idle),
      DSX_PERF_KEEP_ALIVE: '1',
    };
    // Terminais integrados de apps Electron (Cursor/VS Code) exportam
    // ELECTRON_RUN_AS_NODE=1, o que faria o binário subir como Node puro.
    delete env.ELECTRON_RUN_AS_NODE;

    const started = Date.now();
    const child = spawn(electronBin(), ['.'], { cwd: ROOT, env, stdio: ['ignore', 'pipe', 'pipe'] });
    let log = '';
    child.stdout.on('data', (c) => {
      log += c;
    });
    child.stderr.on('data', (c) => {
      log += c;
    });

    const hardTimeout = setTimeout(() => finish('timeout'), args.idle + 120000);

    const poll = setInterval(() => {
      if (!fs.existsSync(outFile)) return;
      let data;
      try {
        data = readJson(outFile);
      } catch {
        return; // arquivo ainda sendo escrito
      }
      clearInterval(poll);

      // Complementa com a árvore de processos e RSS dos filhos enquanto o app ainda vive.
      const tree = processTree(child.pid);
      const children = (data.children || []).map((c) => ({
        ...c,
        rssKB: c.pid ? rssKB(c.pid) : null,
      }));
      const electronPids = new Set((data.appMetrics || []).map((m) => m.pid));
      const extraPids = tree.filter((p) => !electronPids.has(p));
      const extra = extraPids.map((pid) => ({ pid, rssKB: rssKB(pid) }));

      data.children = children;
      data.processTree = { total: tree.length, electron: electronPids.size, extra };
      data.wallMsToExit = null;

      try {
        child.kill('SIGTERM');
      } catch {
        /* ignore */
      }
      setTimeout(() => {
        try {
          child.kill('SIGKILL');
        } catch {
          /* ignore */
        }
      }, 3000);
      finish(null, data);
    }, 250);

    function finish(err, data) {
      clearTimeout(hardTimeout);
      clearInterval(poll);
      try {
        fs.unlinkSync(outFile);
      } catch {
        /* ignore */
      }
      resolve({ err, data, wallMs: Date.now() - started, log: err ? log.slice(-4000) : undefined });
    }
  });
}

function markMs(data, name) {
  const m = (data.marks || []).find((x) => x.name === name);
  return m ? m.t : null;
}

function summarizeRuns(runs) {
  const ok = runs.filter((r) => !r.err && r.data);
  if (!ok.length) return { ok: 0, error: runs.map((r) => r.err).join(', ') };

  const marksOf = (name) => median(ok.map((r) => markMs(r.data, name)));
  const first = ok[0].data;

  const backendRss = median(
    ok.map((r) => (r.data.children || []).reduce((n, c) => n + (c.rssKB || 0), 0))
  );
  const electronRss = median(
    ok.map((r) => (r.data.appMetrics || []).reduce((n, m) => n + (m.workingSetKB || 0), 0))
  );
  const extraRss = median(
    ok.map((r) => ((r.data.processTree && r.data.processTree.extra) || []).reduce((n, p) => n + (p.rssKB || 0), 0))
  );

  return {
    ok: ok.length,
    platform: `${first.platform}-${first.arch}`,
    electron: first.electron,
    packaged: first.packaged,
    marksMs: {
      appReady: marksOf('app-ready'),
      drmReady: marksOf('drm-ready'),
      sdkSpawned: marksOf('sdk-spawned'),
      apiReady: marksOf('api-ready'),
      apiWait: median(ok.map((r) => markMs(r.data, 'api-ready') - markMs(r.data, 'sdk-spawned'))),
      windowCreated: marksOf('window-created'),
      windowDidFinishLoad: marksOf('window-did-finish-load'),
      scriptsParsed: marksOf('renderer:scripts-parsed'),
      tablineWidgetsLoaded: marksOf('renderer:tabline-widgets-loaded'),
      workspaceMounted: marksOf('renderer:workspace-mounted'),
    },
    processes: {
      childrenPersistent: (first.children || []).filter((c) => c.pid).length,
      childrenNames: (first.children || []).filter((c) => c.pid).map((c) => c.name),
      electronProcesses: (first.appMetrics || []).length,
      treeTotal: first.processTree ? first.processTree.total : null,
      extraNonElectron: first.processTree ? first.processTree.extra.length : null,
    },
    memoryMB: {
      main: median(ok.map((r) => r.data.main.rssKB)) / 1024,
      backendChildren: backendRss / 1024,
      electronAll: electronRss / 1024,
      extraProcesses: extraRss / 1024,
      appTotal: (electronRss + backendRss + extraRss) / 1024,
    },
    raw: ok.map((r) => r.data),
  };
}

// ---------------------------------------------------------------------------
// saída
// ---------------------------------------------------------------------------

function fmtMs(v) {
  return v == null ? 'n/d' : `${Math.round(v)} ms`;
}
function fmtMB(v) {
  return v == null ? 'n/d' : `${Math.round(v * 10) / 10} MB`;
}

function printStatic(s) {
  console.log(`\n== Estático — DSX v${s.version} (Electron ${s.electron}) ==`);
  console.log(`Scripts <script> em index.html ........ ${s.renderer.scriptTagsIndexHtml}`);
  console.log(`Scripts dinâmicos (Tabline.js) ........ ${s.renderer.dynamicScriptsTabline}`);
  console.log(`Total de JS no boot ................... ${s.renderer.totalScriptsBoot} (bundler: ${s.renderer.bundler})`);
  console.log(`CSS: <link> ${s.renderer.styleLinks} · @import no manifest ${s.renderer.cssImportsInManifest}`);
  console.log('\nLinhas por área (js/css/html):');
  for (const [k, v] of Object.entries(s.loc)) {
    console.log(`  ${k.padEnd(38)} ${String(v.lines).padStart(7)} linhas · ${v.files} arquivos`);
  }
  console.log(`\nCamada de edição (Factory + Customise + Clock/factory.js): ${s.editorLayerLines} linhas`);
  for (const [k, v] of Object.entries(s.backendNodeModules)) {
    console.log(`${k.padEnd(38)} ${v.files} arquivos · ${v.mb} MB`);
  }
  for (const [k, v] of Object.entries(s.backendDeps)) {
    console.log(`Deps ${k}: ${v.join(', ') || '—'}`);
  }
  if (s.installers.length) {
    console.log('\nInstaladores em release/:');
    s.installers.forEach((i) => console.log(`  ${i.file}  ${i.mb} MB`));
  } else {
    console.log('\nInstaladores: nenhum em release/ (rode npm run dist:* para medir tamanho)');
  }
}

function printRuntime(r) {
  console.log(`\n== Runtime — ${r.platform} · Electron ${r.electron} · ${r.ok} execução(ões), mediana ==`);
  if (!r.ok) {
    console.log(`Falha: ${r.error}`);
    return;
  }
  const m = r.marksMs;
  console.log(`app ready ............................. ${fmtMs(m.appReady)}`);
  console.log(`DRM bootstrap ......................... ${fmtMs(m.drmReady)}`);
  console.log(`API-DSX /ready (espera do main) ....... ${fmtMs(m.apiWait)}  (abs ${fmtMs(m.apiReady)})`);
  console.log(`janela criada ......................... ${fmtMs(m.windowCreated)}`);
  console.log(`index.html carregado (scripts) ........ ${fmtMs(m.windowDidFinishLoad)}`);
  console.log(`renderer: scripts parseados ........... ${fmtMs(m.scriptsParsed)}`);
  console.log(`renderer: widgets Tabline carregados .. ${fmtMs(m.tablineWidgetsLoaded)}`);
  console.log(`renderer: workspace montado ........... ${fmtMs(m.workspaceMounted)}`);
  const p = r.processes;
  console.log(`\nProcessos: ${p.childrenPersistent} filho(s) Node persistente(s) [${p.childrenNames.join(', ')}] · ` +
    `${p.electronProcesses} processos Electron/Chromium · árvore total ${p.treeTotal ?? 'n/d'} · extras não-Electron ${p.extraNonElectron ?? 'n/d'}`);
  const mem = r.memoryMB;
  console.log(`Memória (RSS após ${args.idle} ms ocioso): main ${fmtMB(mem.main)} · backend Node ${fmtMB(mem.backendChildren)} · ` +
    `Electron total ${fmtMB(mem.electronAll)} · extras ${fmtMB(mem.extraProcesses)} · app total ${fmtMB(mem.appTotal)}`);
}

function printMarkdown(s, r) {
  const row = (metric, value) => `| ${metric} | ${value} |`;
  console.log('\n<!-- linhas para Version/Planejamento/Baseline v1.4.MD -->');
  console.log('| Métrica | Valor |');
  console.log('|---|---|');
  console.log(row('Scripts no boot (estáticos + Tabline)', `${s.renderer.scriptTagsIndexHtml} + ${s.renderer.dynamicScriptsTabline} = ${s.renderer.totalScriptsBoot}`));
  console.log(row('Linhas da camada de edição (Factory + Customise + Clock/factory)', s.editorLayerLines));
  for (const [k, v] of Object.entries(s.backendNodeModules)) console.log(row(k, `${v.files} arquivos · ${v.mb} MB`));
  s.installers.forEach((i) => console.log(row(`Instalador ${i.file}`, `${i.mb} MB`)));
  if (r && r.ok) {
    const m = r.marksMs;
    console.log(row(`Espera do main pela API (${r.platform})`, fmtMs(m.apiWait)));
    console.log(row(`Janela criada (${r.platform})`, fmtMs(m.windowCreated)));
    console.log(row(`index.html carregado (${r.platform})`, fmtMs(m.windowDidFinishLoad)));
    console.log(row(`Workspace montado (${r.platform})`, fmtMs(m.workspaceMounted)));
    console.log(row(`Processos filhos Node persistentes (${r.platform})`, r.processes.childrenPersistent));
    console.log(row(`RSS backend Node (${r.platform})`, fmtMB(r.memoryMB.backendChildren)));
    console.log(row(`RSS total do app ocioso (${r.platform})`, fmtMB(r.memoryMB.appTotal)));
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------

(async () => {
  const result = { generatedAt: new Date().toISOString(), host: { platform: process.platform, arch: process.arch, cpus: os.cpus().length, totalMemGB: Math.round(os.totalmem() / 1e9) } };

  result.static = staticMetrics();
  printStatic(result.static);

  if (!args.static) {
    console.log(`\nAbrindo o app ${args.runs}x (ocioso ${args.idle} ms por execução)…`);
    const runs = [];
    for (let i = 0; i < args.runs; i += 1) {
      const r = await runOnce(i);
      if (r.err) console.warn(`  execução ${i + 1}: ${r.err}\n${r.log || ''}`);
      else console.log(`  execução ${i + 1}: ok (${r.wallMs} ms)`);
      runs.push(r);
    }
    result.runtime = summarizeRuns(runs);
    printRuntime(result.runtime);
  }

  if (args.md) printMarkdown(result.static, result.runtime);

  if (args.json) {
    const out = path.resolve(args.json);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    fs.writeFileSync(out, JSON.stringify(result, null, 2));
    console.log(`\nJSON gravado em ${out}`);
  }
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
