import { getDb } from './client';

export type ProfileKind = 'dog' | 'human';

export type Profile = {
  id: number;
  name: string;
  kind: ProfileKind;
  avatar_emoji: string;
  photo_uri: string | null;
  created_at: number;
};

export type Medication = {
  id: number;
  profile_id: number;
  name: string;
  dose: string | null;
  interval_days: number;
  start_date: string;
  reminder_time: string;
  color: string;
  note: string | null;
  is_active: number;
  created_at: number;
};

export type DoseStatus = 'taken' | 'skipped' | 'pending';

export type DoseLog = {
  id: number;
  medication_id: number;
  scheduled_at: string;
  taken_at: string | null;
  status: DoseStatus;
  created_at: number;
};

export type NewMedication = Omit<Medication, 'id' | 'created_at' | 'is_active'>;
export type MedicationUpdate = Omit<Medication, 'id' | 'created_at' | 'profile_id' | 'is_active'>;

// --- profiles -------------------------------------------------

export async function listProfiles(): Promise<Profile[]> {
  const db = await getDb();
  return db.getAllAsync<Profile>('SELECT * FROM profiles ORDER BY id');
}

export async function getProfile(id: number): Promise<Profile | null> {
  const db = await getDb();
  return db.getFirstAsync<Profile>('SELECT * FROM profiles WHERE id = ?', id);
}

export async function updateProfile(
  id: number,
  name: string,
  avatar_emoji: string,
  photo_uri: string | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'UPDATE profiles SET name = ?, avatar_emoji = ?, photo_uri = ? WHERE id = ?',
    name,
    avatar_emoji,
    photo_uri,
    id
  );
}

// --- medications ----------------------------------------------

export async function listMedicationsByProfile(profile_id: number): Promise<Medication[]> {
  const db = await getDb();
  return db.getAllAsync<Medication>(
    'SELECT * FROM medications WHERE profile_id = ? AND is_active = 1 ORDER BY created_at DESC',
    profile_id
  );
}

export async function listAllActiveMedications(): Promise<Medication[]> {
  const db = await getDb();
  return db.getAllAsync<Medication>(
    'SELECT * FROM medications WHERE is_active = 1 ORDER BY profile_id, created_at DESC'
  );
}

export async function getMedication(id: number): Promise<Medication | null> {
  const db = await getDb();
  return db.getFirstAsync<Medication>('SELECT * FROM medications WHERE id = ?', id);
}

export async function createMedication(med: NewMedication): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO medications
       (profile_id, name, dose, interval_days, start_date, reminder_time, color, note, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    med.profile_id,
    med.name,
    med.dose,
    med.interval_days,
    med.start_date,
    med.reminder_time,
    med.color,
    med.note,
    now
  );
  return result.lastInsertRowId as number;
}

export async function updateMedication(id: number, med: MedicationUpdate): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE medications
        SET name = ?, dose = ?, interval_days = ?, start_date = ?,
            reminder_time = ?, color = ?, note = ?
      WHERE id = ?`,
    med.name,
    med.dose,
    med.interval_days,
    med.start_date,
    med.reminder_time,
    med.color,
    med.note,
    id
  );
}

export async function deleteMedication(id: number): Promise<void> {
  const db = await getDb();
  await db.runAsync('DELETE FROM medications WHERE id = ?', id);
}

// --- dose logs ------------------------------------------------

export async function getDoseLog(
  medication_id: number,
  scheduled_at: string
): Promise<DoseLog | null> {
  const db = await getDb();
  return db.getFirstAsync<DoseLog>(
    'SELECT * FROM dose_logs WHERE medication_id = ? AND scheduled_at = ?',
    medication_id,
    scheduled_at
  );
}

export async function listDoseLogsForProfileInRange(
  profile_id: number,
  fromIso: string,
  toIso: string
): Promise<DoseLog[]> {
  const db = await getDb();
  return db.getAllAsync<DoseLog>(
    `SELECT l.*
       FROM dose_logs l
       JOIN medications m ON l.medication_id = m.id
      WHERE m.profile_id = ?
        AND l.scheduled_at BETWEEN ? AND ?`,
    profile_id,
    fromIso,
    toIso
  );
}

export async function upsertDoseLog(
  medication_id: number,
  scheduled_at: string,
  status: DoseStatus,
  taken_at: string | null
): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO dose_logs (medication_id, scheduled_at, taken_at, status, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (medication_id, scheduled_at) DO UPDATE SET
       taken_at = excluded.taken_at,
       status = excluded.status`,
    medication_id,
    scheduled_at,
    taken_at,
    status,
    now
  );
}

export async function clearDoseLog(
  medication_id: number,
  scheduled_at: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    'DELETE FROM dose_logs WHERE medication_id = ? AND scheduled_at = ?',
    medication_id,
    scheduled_at
  );
}
