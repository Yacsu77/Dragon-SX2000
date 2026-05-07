'use strict';

const { spawn } = require('child_process');
const BaseController = require('./BaseController');

/**
 * Controlador de mídia para macOS via AppleScript.
 *
 * Usa `osascript` para enviar comandos ao processo "Music" do sistema (que
 * captura todas as teclas multimídia). Funciona com Apple Music, Spotify
 * (quando ativo), e qualquer player que respeite as media keys do macOS.
 *
 * Mapeia para as ações do System Events com as virtual key codes:
 *   16  → key code F8  (play/pause via mídia legacy)
 *
 * Implementação simples e portátil. Cada comando é um osascript curto.
 */
class MacOSController extends BaseController {
  async send(action) {
    const norm = this._normalize(action);
    if (!norm) return { ok: false, error: 'invalid_action' };

    const script = this._buildScript(norm);
    if (!script) return { ok: false, error: 'unsupported_action' };

    return new Promise((resolve) => {
      const proc = spawn('osascript', ['-e', script]);
      let err = '';
      proc.stderr.on('data', (d) => { err += d.toString(); });
      proc.on('error', (e) => resolve({ ok: false, error: e.message }));
      proc.on('exit', (code) => {
        if (code === 0) return resolve({ ok: true, action: norm });
        resolve({ ok: false, error: err.trim() || `exit ${code}` });
      });
    });
  }

  // eslint-disable-next-line class-methods-use-this
  _buildScript(action) {
    // AppleScript usando System Events para enviar teclas multimídia.
    // `key code` 16 corresponde a F8 (play/pause histórico do macOS).
    // Em macOS recentes a forma mais confiável é controlar o app diretamente.
    switch (action) {
      case 'play_pause':
        return 'tell application "System Events" to key code 49 using {function down}'
          // fallback: também tenta iTunes/Music
          + '\ntry\ntell application "Music" to playpause\nend try';
      case 'play':
        return 'try\ntell application "Music" to play\nend try';
      case 'pause':
        return 'try\ntell application "Music" to pause\nend try';
      case 'next':
        return 'try\ntell application "Music" to next track\nend try'
          + '\ntry\ntell application "Spotify" to next track\nend try';
      case 'prev':
        return 'try\ntell application "Music" to previous track\nend try'
          + '\ntry\ntell application "Spotify" to previous track\nend try';
      case 'stop':
        return 'try\ntell application "Music" to stop\nend try'
          + '\ntry\ntell application "Spotify" to pause\nend try';
      default:
        return null;
    }
  }
}

module.exports = MacOSController;
