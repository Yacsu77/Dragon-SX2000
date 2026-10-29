/**
 * Instala as ações da suíte na janela real e chama uma pelo nome.
 *
 * O arquivo page/actions.js roda dentro da página, com as funções que
 * ela já tem. O processo principal só espera o resultado.
 */

const fs = require('fs');
const path = require('path');

async function install(win) {
  const source = fs.readFileSync(path.join(__dirname, '..', 'page', 'actions.js'), 'utf8');
  await win.webContents.executeJavaScript(
    `(() => { const module = { exports: {} }; ${source}\nwindow.DsxSuite = module.exports; })()`,
    true
  );
}

async function call(win, name, ...args) {
  if (typeof name !== 'string' || !name) {
    return { ok: false, error: 'ação da suíte sem nome' };
  }
  const source = `(async () => {
    try {
      const value = await window.DsxSuite[${JSON.stringify(name)}](${args.map((arg) => JSON.stringify(arg)).join(', ')});
      return JSON.stringify({ ok: true, value: value === undefined ? null : value });
    } catch (err) {
      return JSON.stringify({ ok: false, error: String(err && (err.stack || err.message) || err) });
    }
  })()`;
  try {
    const raw = await win.webContents.executeJavaScript(source, true);
    const parsed = JSON.parse(raw);
    if (!parsed.ok) return { ok: false, error: parsed.error };
    return parsed.value;
  } catch (err) {
    return { ok: false, error: err && err.message ? err.message : String(err) };
  }
}

module.exports = {
  install,
  call,
};
