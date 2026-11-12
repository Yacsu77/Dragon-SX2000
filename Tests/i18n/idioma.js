/**
 * Comportamento do idioma, sem abrir o app.
 *
 * Sugestão do sistema, reserva em inglês, lista incompleta,
 * lista quebrada e troca com uma leitura só.
 */

const assert = require('assert');
const Idioma = require('../../Frontend/src/core/Idioma');

const INGLES = {
  'idioma.titulo': 'Choose your language',
  'topo.menu': 'Menu',
  'topo.voltar': 'Back',
};

function base(parcial) {
  return {
    en: { ...INGLES },
    pt: { 'idioma.titulo': 'Escolha o idioma', ...(parcial || {}) },
    es: { 'topo.menu': 'Menú', 'topo.voltar': 'Atrás' },
  };
}

async function prepararCom(opcoes) {
  const lidas = [];
  const memoria = { locale: opcoes.guardado || null };
  const mapas = opcoes.mapas;
  const resultado = await Idioma.preparar({
    idiomaSistema: opcoes.sistema,
    ler: async (codigo) => {
      lidas.push(codigo);
      if (opcoes.quebrar && opcoes.quebrar.includes(codigo)) throw new Error('lista quebrada');
      const mapa = mapas[codigo];
      if (!mapa) throw new Error('ausente');
      return mapa;
    },
    lerGuardado: () => memoria.locale,
    guardar: (valor) => {
      memoria.locale = valor;
    },
    perguntar: async (sugestao) => {
      if (opcoes.aoPerguntar) return opcoes.aoPerguntar(sugestao);
      return sugestao;
    },
  });
  return { resultado, lidas, memoria };
}

async function sugestaoDoSistema() {
  assert.strictEqual(Idioma.sugerir('pt-BR'), 'pt');
  assert.strictEqual(Idioma.sugerir('es-MX'), 'es');
  assert.strictEqual(Idioma.sugerir('en-US'), 'en');
  assert.strictEqual(Idioma.sugerir('fr-FR'), 'en');
  assert.strictEqual(Idioma.sugerir(''), 'en');
}

async function primeiraAberturaFicaEmIngles() {
  let perguntou = false;
  const { resultado, lidas } = await prepararCom({
    sistema: 'pt-BR',
    mapas: base(),
    aoPerguntar: () => {
      perguntou = true;
      return 'pt';
    },
  });
  assert.strictEqual(perguntou, false);
  assert.strictEqual(resultado.codigo, 'en');
  assert.deepStrictEqual(lidas, ['en']);
  assert.strictEqual(Idioma.t('topo.menu'), 'Menu');
}

async function abreDeNovoComOIdiomaSalvo() {
  const { resultado, lidas } = await prepararCom({
    sistema: 'en',
    mapas: base(),
    guardado: 'pt',
  });
  assert.strictEqual(resultado.codigo, 'pt');
  assert.deepStrictEqual(lidas, ['en', 'pt']);
  assert.strictEqual(Idioma.t('idioma.titulo'), 'Escolha o idioma');
  assert.strictEqual(Idioma.t('topo.voltar'), 'Back');
}

async function idiomaDesconhecido() {
  const { resultado } = await prepararCom({
    sistema: 'ja-JP',
    mapas: base(),
  });
  assert.strictEqual(resultado.codigo, 'en');
  assert.strictEqual(Idioma.t('topo.menu'), 'Menu');
}

async function listaQuebrada() {
  const { resultado } = await prepararCom({
    sistema: 'en',
    mapas: base(),
    guardado: 'en',
  });
  assert.strictEqual(resultado.codigo, 'en');
  const codigo = await Idioma.definir('pt', {
    guardar: () => {},
    ler: async () => {
      throw new Error('json inválido');
    },
  });
  assert.strictEqual(codigo, 'en');
  assert.strictEqual(Idioma.t('topo.menu'), 'Menu');
}

async function trocarComUmaLeitura() {
  await prepararCom({
    sistema: 'en',
    mapas: base(),
    guardado: 'en',
  });
  const lidas = [];
  const codigo = await Idioma.definir('es', {
    guardar: () => {},
    ler: async (id) => {
      lidas.push(id);
      return base()[id];
    },
  });
  assert.strictEqual(codigo, 'es');
  assert.deepStrictEqual(lidas, ['es']);
  assert.strictEqual(Idioma.t('topo.menu'), 'Menú');
  assert.strictEqual(Idioma.t('topo.voltar'), 'Atrás');
}

async function main() {
  await sugestaoDoSistema();
  await primeiraAberturaFicaEmIngles();
  await abreDeNovoComOIdiomaSalvo();
  await idiomaDesconhecido();
  await listaQuebrada();
  await trocarComUmaLeitura();
  console.log('idioma ok');
}

if (require.main === module) {
  main().catch((erro) => {
    console.error(erro);
    process.exit(1);
  });
}
