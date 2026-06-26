require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { initializeDatabase } = require('./DB/sqlite');
const { initializeRedis } = require('./DB/redis');
const historyRoutes = require('./routes/historyRoutes');
const errorHandler = require('./Exceptions/errorHandler');

const app = express();
const PORT = process.env.PORT || 3333;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'API-DSX online' });
});

app.use('/history', historyRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await initializeDatabase();
    await initializeRedis();

    app.listen(PORT, () => {
      console.log(`[API-DSX] Servidor rodando em http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('[API-DSX] Falha ao iniciar:', err.message);
    process.exit(1);
  }
}

startServer();
