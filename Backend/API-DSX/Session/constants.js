/**
 * Limites da lista de sessão.
 *
 * O timer grava o diário. Não há vigia de mouse, teclado ou vídeo.
 * O recorte de histórico cabe na memória para a busca inteligente;
 * a tela de histórico continua podendo ler a tabela e misturar o diário.
 */

const FLUSH_INTERVAL_MS = 5 * 60 * 1000;
const HISTORY_RECENT = 500;
const HISTORY_TOP = 100;

module.exports = {
  FLUSH_INTERVAL_MS,
  HISTORY_RECENT,
  HISTORY_TOP,
};
