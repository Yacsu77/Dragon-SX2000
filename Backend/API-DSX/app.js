require('dotenv').config({ quiet: true });

const path = require('path');
const express = require('express');
const cors = require('cors');
const { initializeDatabase, DB_PATH } = require('./DB/sqlite');
const { initializeRedis } = require('./DB/redis');
const historyRoutes = require('./routes/historyRoutes');
const usersRoutes = require('./routes/usersRoutes');
const favoritesRoutes = require('./routes/favoritesRoutes');
const downloadsRoutes = require('./routes/downloadsRoutes');
const vaultRoutes = require('./routes/vaultRoutes');
const tabGroupsRoutes = require('./routes/tabGroupsRoutes');
const errorHandler = require('./Exceptions/errorHandler');

const app = express();
const PORT = process.env.PORT || 3333;
// Quando roda do runtime em Application Support, o boot define DSX_PROJECT_ROOT
// para o probe do Electron ainda reconhecer esta instância.
const PROJECT_ROOT = process.env.DSX_PROJECT_ROOT
  ? path.resolve(process.env.DSX_PROJECT_ROOT)
  : path.resolve(__dirname, '..', '..');
const READY_FEATURES = [
  'users',
  'history',
  'favorites',
  'downloads',
  'vault',
  'tab-groups',
  'smart-suggestions',
];

/** false até SQLite/Redis concluírem — /ready responde starting sem derrubar o listen. */
let isReady = false;

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: isReady ? 'API-DSX online' : 'API-DSX starting',
    starting: !isReady,
  });
});

app.get('/ready', (req, res) => {
  const payload = {
    success: isReady,
    starting: !isReady,
    version: 3,
    pid: process.pid,
    project_root: PROJECT_ROOT,
    api_root: __dirname,
    db_path: DB_PATH,
    features: READY_FEATURES,
  };

  if (!isReady) {
    return res.status(503).json(payload);
  }
  return res.json(payload);
});

app.use('/history', historyRoutes);
app.use('/users', usersRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/downloads', downloadsRoutes);
app.use('/vault', vaultRoutes);
app.use('/tab-groups', tabGroupsRoutes);
app.use(errorHandler);

async function startServer() {
  // Listen cedo: o main.js pode ver /ready (starting) enquanto DB/Redis sobem.
  // Evita timeout falso quando o SQLite demora após noite/iCloud.
  const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[API-DSX] listen em http://127.0.0.1:${PORT} (inicializando…)`);
  });

  server.on('error', (err) => {
    console.error(`[API-DSX] Falha no listen (${err.code || 'erro'}): ${err.message}`);
    process.exit(1);
  });

  try {
    await initializeDatabase();
    await initializeRedis();
    isReady = true;
    console.log(`[API-DSX] Servidor pronto em http://127.0.0.1:${PORT}`);
  } catch (err) {
    console.error('[API-DSX] Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

startServer();
