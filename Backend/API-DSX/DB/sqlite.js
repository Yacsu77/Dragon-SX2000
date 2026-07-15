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

const CREATE_STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    nickname TEXT NOT NULL UNIQUE COLLATE NOCASE,
    photo_path TEXT,
    password_hash TEXT,
    password_salt TEXT,
    vault_pin_hash TEXT,
    vault_pin_salt TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_active_at DATETIME
  )`,

  `CREATE TABLE IF NOT EXISTS browser_history (
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
    profile_id TEXT,
    user_id TEXT
  )`,

  `CREATE TABLE IF NOT EXISTS downloads (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    url TEXT NOT NULL,
    filename TEXT,
    mime TEXT,
    size INTEGER,
    state TEXT,
    save_path TEXT,
    started_at DATETIME,
    finished_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS favorites (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT,
    url TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,

  `CREATE TABLE IF NOT EXISTS password_vault (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    origin TEXT NOT NULL,
    username TEXT,
    ciphertext TEXT NOT NULL,
    iv TEXT NOT NULL,
    meta TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`,
];

const CREATE_INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_browser_history_url ON browser_history(url)',
  'CREATE INDEX IF NOT EXISTS idx_browser_history_profile_id ON browser_history(profile_id)',
  'CREATE INDEX IF NOT EXISTS idx_browser_history_user_id ON browser_history(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_browser_history_last_visit_time ON browser_history(last_visit_time)',
  'CREATE INDEX IF NOT EXISTS idx_users_nickname ON users(nickname)',
  'CREATE INDEX IF NOT EXISTS idx_downloads_user_id ON downloads(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON favorites(user_id)',
  'CREATE INDEX IF NOT EXISTS idx_favorites_user_url ON favorites(user_id, url)',
  'CREATE INDEX IF NOT EXISTS idx_password_vault_user_id ON password_vault(user_id)',
];

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

async function ensureColumn(table, column, definition) {
  const cols = await all(`PRAGMA table_info(${table})`);
  if (cols.some((c) => c.name === column)) return;
  await run(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
}

async function migrateLegacyHistory() {
  await ensureColumn('browser_history', 'user_id', 'user_id TEXT');
  await run(
    `UPDATE browser_history
     SET user_id = profile_id
     WHERE user_id IS NULL AND profile_id IS NOT NULL`
  );
}

async function migrateUsersExtras() {
  await ensureColumn('users', 'vault_pin_hash', 'vault_pin_hash TEXT');
  await ensureColumn('users', 'vault_pin_salt', 'vault_pin_salt TEXT');
  await ensureColumn('users', 'photo_path', 'photo_path TEXT');
  await ensureColumn('users', 'password_hash', 'password_hash TEXT');
  await ensureColumn('users', 'password_salt', 'password_salt TEXT');
  await ensureColumn('users', 'last_active_at', 'last_active_at DATETIME');
  await ensureColumn('users', 'updated_at', 'updated_at DATETIME');
}

async function initializeDatabase() {
  await run('PRAGMA foreign_keys = ON');

  for (const sql of CREATE_STATEMENTS) {
    await run(sql);
  }

  await migrateLegacyHistory();
  await migrateUsersExtras();

  for (const sql of CREATE_INDEXES) {
    await run(sql);
  }
}

module.exports = {
  db,
  DB_PATH,
  initializeDatabase,
  run,
  get,
  all,
};
