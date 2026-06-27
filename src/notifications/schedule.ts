import { addDays } from 'date-fns';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { listAllActiveMedications, listProfiles, Medication } from '@/db/queries';
import { expandScheduleForMedication } from '@/utils/schedule';

export const DOSE_CATEGORY_ID = 'DOSE';
export const NOTIFICATION_CHANNEL_ID = 'medication-reminders';
const SCHEDULE_HORIZON_DAYS = 60;
const isWeb = Platform.OS === 'web';

export async function setupNotifications(): Promise<void> {
  if (isWeb) return;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(NOTIFICATION_CHANNEL_ID, {
      name: 'お薬リマインダー',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FFB6B9',
    });
  }

  await Notifications.setNotificationCategoryAsync(DOSE_CATEGORY_ID, [
    {
      identifier: 'taken',
      buttonTitle: '✓ あげた',
      options: { opensAppToForeground: false },
    },
  ]);
}

export async function ensureNotificationPermission(): Promise<boolean> {
  if (isWeb) return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const next = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowBadge: false, allowSound: true },
  });
  return next.granted;
}

function notificationIdentifier(medication_id: number, isoKey: string): string {
  return `med-${medication_id}-${isoKey}`;
}

export async function scheduleMedicationNotifications(
  med: Medication,
  profileName: string
): Promise<void> {
  if (isWeb) return;
  const now = new Date();
  const horizon = addDays(now, SCHEDULE_HORIZON_DAYS);
  const doses = expandScheduleForMedication(med, now, horizon);

  for (const dose of doses) {
    await Notifications.scheduleNotificationAsync({
      identifier: notificationIdentifier(med.id, dose.isoKey),
      content: {
        title: `💊 ${med.name} の時間です`,
        body: med.dose
          ? `${profileName}に ${med.dose} をあげましょう`
          : `${profileName}に1回分をあげましょう`,
        categoryIdentifier: DOSE_CATEGORY_ID,
        data: { medication_id: med.id, scheduled_at: dose.isoKey },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dose.date,
        channelId: NOTIFICATION_CHANNEL_ID,
      },
    });
  }
}

export async function cancelMedicationNotifications(medication_id: number): Promise<void> {
  if (isWeb) return;
  const all = await Notifications.getAllScheduledNotificationsAsync();
  const prefix = `med-${medication_id}-`;
  await Promise.all(
    all
      .filter((n) => n.identifier.startsWith(prefix))
      .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier))
  );
}

export async function rescheduleMedicationNotifications(
  med: Medication,
  profileName: string
): Promise<void> {
  if (isWeb) return;
  await cancelMedicationNotifications(med.id);
  await scheduleMedicationNotifications(med, profileName);
}

export async function refreshAllNotifications(): Promise<void> {
  if (isWeb) return;
  await Notifications.cancelAllScheduledNotificationsAsync();
  const [meds, profiles] = await Promise.all([listAllActiveMedications(), listProfiles()]);
  const profileNameById = new Map(profiles.map((p) => [p.id, p.name]));
  for (const m of meds) {
    const name = profileNameById.get(m.profile_id) ?? '';
    await scheduleMedicationNotifications(m, name);
  }
}
