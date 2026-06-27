import { getDb } from './client';

export async function runMigrations(): Promise<void> {
  const db = await getDb();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      kind TEXT NOT NULL,
      avatar_emoji TEXT NOT NULL,
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS medications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      dose TEXT,
      interval_days INTEGER NOT NULL,
      start_date TEXT NOT NULL,
      reminder_time TEXT NOT NULL,
      color TEXT NOT NULL,
      note TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS dose_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER NOT NULL,
      scheduled_at TEXT NOT NULL,
      taken_at TEXT,
      status TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY (medication_id) REFERENCES medications(id) ON DELETE CASCADE,
      UNIQUE (medication_id, scheduled_at)
    );

    CREATE INDEX IF NOT EXISTS idx_medications_profile ON medications(profile_id);
    CREATE INDEX IF NOT EXISTS idx_dose_logs_medication ON dose_logs(medication_id);
    CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled ON dose_logs(scheduled_at);

    CREATE TABLE IF NOT EXISTS med_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      medication_id INTEGER,
      profile_id INTEGER,
      medication_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      created_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_med_events_medication ON med_events(medication_id);
    CREATE INDEX IF NOT EXISTS idx_med_events_profile ON med_events(profile_id);
    CREATE INDEX IF NOT EXISTS idx_med_events_created ON med_events(created_at);
  `);

  const medCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('medications')"
  );
  if (!medCols.some((c) => c.name === 'schedule_type')) {
    await db.execAsync(
      "ALTER TABLE medications ADD COLUMN schedule_type TEXT NOT NULL DEFAULT 'interval'"
    );
  }
  if (!medCols.some((c) => c.name === 'monthly_day')) {
    await db.execAsync('ALTER TABLE medications ADD COLUMN monthly_day INTEGER');
  }
  if (!medCols.some((c) => c.name === 'weekly_days')) {
    await db.execAsync('ALTER TABLE medications ADD COLUMN weekly_days TEXT');
  }

  const profileCols = await db.getAllAsync<{ name: string }>(
    "PRAGMA table_info('profiles')"
  );
  if (!profileCols.some((c) => c.name === 'photo_uri')) {
    await db.execAsync('ALTER TABLE profiles ADD COLUMN photo_uri TEXT');
  }

  const count = await db.getFirstAsync<{ c: number }>(
    'SELECT COUNT(*) as c FROM profiles'
  );
  if ((count?.c ?? 0) === 0) {
    const now = Date.now();
    await db.runAsync(
      'INSERT INTO profiles (name, kind, avatar_emoji, created_at) VALUES (?, ?, ?, ?)',
      'ワンちゃん',
      'dog',
      '🐶',
      now
    );
    await db.runAsync(
      'INSERT INTO profiles (name, kind, avatar_emoji, created_at) VALUES (?, ?, ?, ?)',
      '奥さん',
      'human',
      '👩',
      now
    );
  }
}
