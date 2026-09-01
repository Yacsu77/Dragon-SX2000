/**
 * Verifica arquivos críticos + Backend pronto para empacotar.
 * Exit 1 se algo obrigatório estiver faltando.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const pkg = require(path.join(ROOT, 'package.json'));

function mustExist(rel) {
  const full = path.join(ROOT, rel);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing: ${rel}`);
  }
  return full;
}

function main() {
  if (pkg.version !== '1.4.0') {
    throw new Error(`Expected package.json version 1.4.0, got ${pkg.version}`);
  }
  if (pkg.build?.productName !== 'DSX') {
    throw new Error(`Expected productName DSX, got ${pkg.build?.productName}`);
  }

  const required = [
    'main.js',
    'preload.js',
    'scripts/prepare-backend.js',
    'scripts/before-pack.js',
    'Frontend/src/index.html',
    'Frontend/src/settings/perfSettings.js',
    'Frontend/src/js/connectionPrefetch.js',
    'Frontend/src/shortcuts/actions/navigation-controls/index.js',
    'Frontend/Telas/Atalhos/Atalhos.js',
    'Frontend/Telas/Atalhos/Atalhos.html',
    'Frontend/Telas/Atalhos/Atalhos.css',
    'Frontend/Telas/Editar/Editar.js',
    'Frontend/Telas/Editar/Editar.html',
    'Frontend/MiniTelas/MiniAtalhos/MiniAtalhos.js',
    'Frontend/src/Browser/Browser.css',
    'Frontend/src/Tabs/Tabs.core.js',
    'Frontend/src/Tabs/TabWarmth.js',
    'Frontend/src/Tabs/TabGroups.runtime.js',
    'Frontend/src/core/AppShell.js',
    'Frontend/src/Janelas/index.js',
    'Frontend/src/Janelas/animations/AnimationHook.js',
    'Frontend/src/Janelas/split/SplitHost.js',
    'Frontend/src/Janelas/split/SplitPaneChrome.js',
    'Frontend/src/Janelas/split/SplitDropController.js',
    'Frontend/src/Janelas/effects/RgbClock.js',
    'Frontend/src/search/SmartSearch.js',
    'Backend/API-DSX/boot.js',
    'Backend/API-DSX/app.js',
    'Backend/API-DSX/package.json',
    'Backend/API-DSX/package-lock.json',
    'Backend/API-DSX/DB/sqlite.js',
    'Backend/API-DSX/DB/redis.js',
    'Backend/SDK/server.js',
    'Backend/SDK/package.json',
    'Backend/SDK/package-lock.json',
    'UserINTer/Tabline/idget/Wallpaper/WWP.jpg',
    'UserINTer/Tabline/idget/Wallpaper/WWP1.png',
    'UserINTer/Tabline/idget/Wallpaper/WWP3.jpg',
    'UserINTer/Tabline/idget/Wallpaper/index.js',
    'Version/Lançamento/Log v1.4.MD',
  ];

  const missing = required.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missing.length) {
    throw new Error(`Missing build-critical files:\n  - ${missing.join('\n  - ')}`);
  }

  const backendDeps = [
    'Backend/API-DSX/node_modules/express/package.json',
    'Backend/API-DSX/node_modules/sqlite3/package.json',
    'Backend/API-DSX/node_modules/cors/package.json',
    'Backend/API-DSX/node_modules/dotenv/package.json',
    'Backend/SDK/node_modules/ws/package.json',
  ];
  const missingDeps = backendDeps.filter((f) => !fs.existsSync(path.join(ROOT, f)));
  if (missingDeps.length) {
    throw new Error(
      `Backend deps ausentes (rode npm run prepare:backend):\n  - ${missingDeps.join('\n  - ')}`
    );
  }

  if (!pkg.build?.extraResources?.length) {
    throw new Error('package.json build.extraResources deve incluir Backend');
  }

  const extraFrom = pkg.build.extraResources.map((e) => e.from || e).join(',');
  if (!extraFrom.includes('API-DSX') || !extraFrom.includes('SDK')) {
    throw new Error('extraResources deve incluir Backend/API-DSX e Backend/SDK');
  }

  mustExist('Backend/API-DSX/node_modules');
  mustExist('Backend/SDK/node_modules');

  console.log(`DSX v${pkg.version} — productName=${pkg.build.productName}`);
  console.log(`Critical files OK (${required.length})`);
  console.log(`Backend deps OK (${backendDeps.length})`);
  console.log('Wallpapers WWP/WWP1/WWP3 OK');
  console.log('extraResources Backend OK');
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
