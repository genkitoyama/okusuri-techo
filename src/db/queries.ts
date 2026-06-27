import * as SQLite from 'expo-sqlite';

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

export type ScheduleType = 'interval' | 'monthly' | 'weekly';

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
  schedule_type: ScheduleType;
  monthly_day: number | null;
  weekly_days: string | null;
  is_active: number;
  created_at: number;
};

export type MedEventType =
  | 'add'
  | 'stop'
  | 'update_dose'
  | 'update_interval'
  | 'update_time';

export type MedEvent = {
  id: number;
  medication_id: number | null;
  profile_id: number | null;
  medication_name: string;
  event_type: MedEventType;
  payload: string | null;
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

async function recordEvent(
  db: SQLite.SQLiteDatabase,
  event: Omit<MedEvent, 'id' | 'created_at'>
): Promise<void> {
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO med_events (medication_id, profile_id, medication_name, event_type, payload, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    event.medication_id,
    event.profile_id,
    event.medication_name,
    event.event_type,
    event.payload,
    now
  );
}

function scheduleSnapshot(med: NewMedication | Medication) {
  return {
    schedule_type: med.schedule_type,
    interval_days: med.interval_days,
    monthly_day: med.monthly_day,
    weekly_days: med.weekly_days,
  };
}

export async function createMedication(med: NewMedication): Promise<number> {
  const db = await getDb();
  const now = Date.now();
  const result = await db.runAsync(
    `INSERT INTO medications
       (profile_id, name, dose, interval_days, start_date, reminder_time, color, note, schedule_type, monthly_day, weekly_days, is_active, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)`,
    med.profile_id,
    med.name,
    med.dose,
    med.interval_days,
    med.start_date,
    med.reminder_time,
    med.color,
    med.note,
    med.schedule_type,
    med.monthly_day,
    med.weekly_days,
    now
  );
  const id = result.lastInsertRowId as number;
  await recordEvent(db, {
    medication_id: id,
    profile_id: med.profile_id,
    medication_name: med.name,
    event_type: 'add',
    payload: JSON.stringify({
      dose: med.dose,
      reminder_time: med.reminder_time,
      ...scheduleSnapshot(med),
    }),
  });
  return id;
}

export async function updateMedication(id: number, med: MedicationUpdate): Promise<void> {
  const db = await getDb();
  const before = await getMedication(id);

  await db.runAsync(
    `UPDATE medications
        SET name = ?, dose = ?, interval_days = ?, start_date = ?,
            reminder_time = ?, color = ?, note = ?, schedule_type = ?, monthly_day = ?, weekly_days = ?
      WHERE id = ?`,
    med.name,
    med.dose,
    med.interval_days,
    med.start_date,
    med.reminder_time,
    med.color,
    med.note,
    med.schedule_type,
    med.monthly_day,
    med.weekly_days,
    id
  );

  if (!before) return;

  if (before.dose !== med.dose) {
    await recordEvent(db, {
      medication_id: id,
      profile_id: before.profile_id,
      medication_name: med.name,
      event_type: 'update_dose',
      payload: JSON.stringify({ from: before.dose, to: med.dose }),
    });
  }
  if (
    before.schedule_type !== med.schedule_type ||
    before.interval_days !== med.interval_days ||
    before.monthly_day !== med.monthly_day ||
    before.weekly_days !== med.weekly_days
  ) {
    await recordEvent(db, {
      medication_id: id,
      profile_id: before.profile_id,
      medication_name: med.name,
      event_type: 'update_interval',
      payload: JSON.stringify({
        from: scheduleSnapshot(before),
        to: scheduleSnapshot({ ...before, ...med }),
      }),
    });
  }
  if (before.reminder_time !== med.reminder_time) {
    await recordEvent(db, {
      medication_id: id,
      profile_id: before.profile_id,
      medication_name: med.name,
      event_type: 'update_time',
      payload: JSON.stringify({ from: before.reminder_time, to: med.reminder_time }),
    });
  }
}

export async function deleteMedication(id: number): Promise<void> {
  const db = await getDb();
  const before = await getMedication(id);
  await db.runAsync('DELETE FROM medications WHERE id = ?', id);
  if (before) {
    await recordEvent(db, {
      medication_id: null,
      profile_id: before.profile_id,
      medication_name: before.name,
      event_type: 'stop',
      payload: null,
    });
  }
}

export async function listMedEvents(filter?: {
  profile_id?: number;
  medication_id?: number;
}): Promise<MedEvent[]> {
  const db = await getDb();
  if (filter?.profile_id != null) {
    return db.getAllAsync<MedEvent>(
      'SELECT * FROM med_events WHERE profile_id = ? ORDER BY created_at DESC',
      filter.profile_id
    );
  }
  if (filter?.medication_id != null) {
    return db.getAllAsync<MedEvent>(
      'SELECT * FROM med_events WHERE medication_id = ? ORDER BY created_at DESC',
      filter.medication_id
    );
  }
  return db.getAllAsync<MedEvent>('SELECT * FROM med_events ORDER BY created_at DESC');
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
