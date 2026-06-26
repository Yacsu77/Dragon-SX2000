const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, 'dsx-browser.db');

const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('[SQLite] Erro ao conectar:', err.message);
  } else {
    console.log('[SQLite] Conectado em', DB_PATH);
  }
});

const CREATE_TABLE = `
  CREATE TABLE IF NOT EXISTS browser_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    url TEXT NOT NULL,
    title TEXT,
    visit_count INTEGER DEFAULT 1,
    typed_count INTEGER DEFAULT 0,
    last_visit_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    favicon_url TEXT,
    transition_type TEXT,
    referrer_url TEXT,
    profile_id TEXT
  )
`;

const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_browser_history_url ON browser_history(url)',
  'CREATE INDEX IF NOT EXISTS idx_browser_history_profile_id ON browser_history(profile_id)',
  'CREATE INDEX IF NOT EXISTS idx_browser_history_last_visit_time ON browser_history(last_visit_time)',
];

function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(CREATE_TABLE, (err) => {
        if (err) return reject(err);

        let pending = CREATE_INDEXES.length;
        CREATE_INDEXES.forEach((sql) => {
          db.run(sql, (indexErr) => {
            if (indexErr) return reject(indexErr);
            pending -= 1;
            if (pending === 0) resolve();
          });
        });
      });
    });
  });
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = {
  db,
  initializeDatabase,
  run,
  get,
  all,
};
