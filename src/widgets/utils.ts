import AsyncStorage from '@react-native-async-storage/async-storage';
import { endOfDay, format, startOfDay } from 'date-fns';

import {
  getProfile,
  listDoseLogsForProfileInRange,
  listMedicationsByProfile,
  listProfiles,
  Profile,
} from '@/db/queries';
import { expandScheduleForMedication } from '@/utils/schedule';

export const WIDGET_PROFILE_STORAGE_KEY = 'okusuri:widget-profile-map';
const PROFILES_CACHE_KEY = 'okusuri:profiles-cache';

async function getCachedProfiles(): Promise<Profile[]> {
  try {
    const raw = await AsyncStorage.getItem(PROFILES_CACHE_KEY);
    return raw ? (JSON.parse(raw) as Profile[]) : [];
  } catch {
    return [];
  }
}

type WidgetProfileEntry = {
  id: number;
  name: string;
  kind: 'dog' | 'human';
  avatar_emoji: string;
  photo_uri: string | null;
};

type WidgetProfileMap = Record<string, number | WidgetProfileEntry>;

async function readMap(): Promise<WidgetProfileMap> {
  try {
    const raw = await AsyncStorage.getItem(WIDGET_PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export async function setWidgetProfile(
  widgetId: number,
  profile: Profile
): Promise<void> {
  const map = await readMap();
  map[String(widgetId)] = {
    id: profile.id,
    name: profile.name,
    kind: profile.kind,
    avatar_emoji: profile.avatar_emoji,
    photo_uri: profile.photo_uri,
  };
  await AsyncStorage.setItem(WIDGET_PROFILE_STORAGE_KEY, JSON.stringify(map));
}

export async function clearWidgetProfile(widgetId: number): Promise<void> {
  const map = await readMap();
  delete map[String(widgetId)];
  await AsyncStorage.setItem(WIDGET_PROFILE_STORAGE_KEY, JSON.stringify(map));
}

async function lookupWidgetProfile(
  widgetId: number
): Promise<{ profile: Profile | null; profileId: number }> {
  const map = await readMap();
  const entry = map[String(widgetId)];
  if (entry && typeof entry === 'object') {
    return {
      profile: {
        id: entry.id,
        name: entry.name,
        kind: entry.kind,
        avatar_emoji: entry.avatar_emoji,
        photo_uri: entry.photo_uri ?? null,
        created_at: 0,
      },
      profileId: entry.id,
    };
  }
  if (typeof entry === 'number') {
    return { profile: null, profileId: entry };
  }
  return { profile: null, profileId: 1 };
}

export type WidgetDose = {
  medicationId: number;
  name: string;
  color: string;
  dose: string | null;
  timeKey: string;
  isoKey: string;
  taken: boolean;
};

export type WidgetData = {
  profile: Profile | null;
  doses: WidgetDose[];
  takenCount: number;
};

export async function loadWidgetDataForWidget(
  widgetId: number
): Promise<WidgetData> {
  // 0. AsyncStorage に widget configuration として保存された profile を最優先で使う
  const { profile: storedProfile, profileId } = await lookupWidgetProfile(
    widgetId
  );
  let profile: Profile | null = storedProfile;

  // 1. もしまだ null（旧スキーマで profileId だけ保存されているケース）なら DB から探す
  if (!profile) {
    try {
      profile = await getProfile(profileId);
    } catch (e) {
      console.warn('[widget] getProfile error', e);
    }
  }
  if (!profile) {
    try {
      const all = await listProfiles();
      profile = all.find((p) => p.id === profileId) ?? all[0] ?? null;
    } catch (e) {
      console.warn('[widget] listProfiles error', e);
    }
  }
  if (!profile) {
    const cached = await getCachedProfiles();
    profile = cached.find((p) => p.id === profileId) ?? cached[0] ?? null;
  }

  if (!profile) return { profile: null, doses: [], takenCount: 0 };
  const targetId = profile.id;

  const doses: WidgetDose[] = [];
  try {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);

    const meds = await listMedicationsByProfile(targetId);
    const logs = await listDoseLogsForProfileInRange(
      targetId,
      `${format(todayStart, 'yyyy-MM-dd')}T00:00`,
      `${format(todayEnd, 'yyyy-MM-dd')}T23:59`
    );
    const logKey = (mid: number, iso: string) => `${mid}|${iso}`;
    const logMap = new Map(
      logs.map((l) => [logKey(l.medication_id, l.scheduled_at), l])
    );

    for (const m of meds) {
      try {
        const dd = expandScheduleForMedication(m, todayStart, todayEnd);
        for (const d of dd) {
          const log = logMap.get(logKey(m.id, d.isoKey));
          doses.push({
            medicationId: m.id,
            name: m.name,
            color: m.color,
            dose: m.dose,
            timeKey: d.timeKey,
            isoKey: d.isoKey,
            taken: log?.status === 'taken',
          });
        }
      } catch (medErr) {
        console.warn('[widget] medication expand error', m.id, medErr);
      }
    }
    doses.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
  } catch (e) {
    console.warn('[widget] doses fetch error', e);
  }

  return {
    profile,
    doses,
    takenCount: doses.filter((d) => d.taken).length,
  };
}
