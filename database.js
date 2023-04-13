const sqlite = require('sqlite');
const sqlite3 = require('sqlite3');

async function openDatabase() {
  return await sqlite.open({
    filename: './points_log.db',
    driver: sqlite3.Database,
  });
}

async function initializeDatabase() {
  const db = await openDatabase();
  await db.exec(`
    CREATE TABLE IF NOT EXISTS point_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id TEXT,
      house TEXT,
      points INTEGER,
      reason TEXT,
      timestamp INTEGER
    )
  `);
  await db.close();
}

module.exports = {
  openDatabase,
  initializeDatabase,
};
