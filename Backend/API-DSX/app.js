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
const errorHandler = require('./Exceptions/errorHandler');

const app = express();
const PORT = process.env.PORT || 3333;
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');

app.use(cors());
app.use(express.json({ limit: '5mb' }));

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API-DSX online' });
});

app.get('/ready', (req, res) => {
  res.json({
    success: true,
    version: 2,
    pid: process.pid,
    project_root: PROJECT_ROOT,
    api_root: __dirname,
    db_path: DB_PATH,
    features: ['users', 'history', 'favorites', 'downloads', 'vault'],
  });
});

app.use('/history', historyRoutes);
app.use('/users', usersRoutes);
app.use('/favorites', favoritesRoutes);
app.use('/downloads', downloadsRoutes);
app.use('/vault', vaultRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await initializeDatabase();
    await initializeRedis();

    app.listen(PORT, '127.0.0.1', () => {
      console.log(`[API-DSX] Servidor rodando em http://127.0.0.1:${PORT}`);
    });
  } catch (err) {
    console.error('[API-DSX] Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

startServer();
