import * as SQLite from 'expo-sqlite';

const DB_NAME = 'okusuri.db';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync(DB_NAME);
  await _db.execAsync('PRAGMA foreign_keys = ON;');
  return _db;
}
