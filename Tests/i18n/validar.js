/**
 * Validação das listas nativas.
 *
 * Confere o catálogo e en, pt, es antes de um commit de idioma
 * seguir para a próxima versão. Não cobre listas da comunidade.
 */

const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '../../Frontend/i18n');
const nativas = ['en', 'pt', 'es'];
const erros = [];

function lerJson(arquivo) {
  const texto = fs.readFileSync(arquivo, 'utf8');
  if (texto.includes('\uFFFD')) erros.push(`${arquivo} tem caractere de substituição`);
  return JSON.parse(texto);
}

function fraseInvalida(frase) {
  if (typeof frase !== 'string' || !frase.trim()) return 'vazia';
  if (frase.includes('\uFFFD')) return 'caractere de substituição';
  if (/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/.test(frase)) return 'caractere de controle';
  return '';
}

function achatar(secoes) {
  const saida = {};
  Object.entries(secoes).forEach(([secao, chaves]) => {
    Object.entries(chaves).forEach(([chave, frase]) => {
      saida[`${secao}.${chave}`] = frase;
    });
  });
  return saida;
}

const catalogo = lerJson(path.join(raiz, 'catalogo.json'));
const referencia = achatar(catalogo.secoes || {});

Object.entries(referencia).forEach(([chave, frase]) => {
  const motivo = fraseInvalida(frase);
  if (motivo) erros.push(`catalogo ${chave} ${motivo}`);
});

nativas.forEach((lingua) => {
  const lista = lerJson(path.join(raiz, 'listas', `${lingua}.json`));
  const chaves = Object.keys(lista);
  const esperadas = Object.keys(referencia);
  esperadas.filter((chave) => !Object.prototype.hasOwnProperty.call(lista, chave))
    .forEach((chave) => erros.push(`${lingua} sem ${chave}`));
  chaves.filter((chave) => !Object.prototype.hasOwnProperty.call(referencia, chave))
    .forEach((chave) => erros.push(`${lingua} extra ${chave}`));
  Object.entries(lista).forEach(([chave, frase]) => {
    const motivo = fraseInvalida(frase);
    if (motivo) erros.push(`${lingua} ${chave} ${motivo}`);
    if (lingua === 'en' && referencia[chave] !== undefined && lista[chave] !== referencia[chave]) {
      erros.push(`en difere em ${chave}`);
    }
  });
});

if (erros.length) {
  erros.forEach((erro) => console.error(erro));
  process.exit(1);
}

console.log(`listas nativas ok (${Object.keys(referencia).length} frases)`);
