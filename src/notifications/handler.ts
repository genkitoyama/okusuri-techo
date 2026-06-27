import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { upsertDoseLog } from '@/db/queries';
import { isoNow } from '@/utils/date';

export function setupNotificationResponseListener(): () => void {
  if (Platform.OS === 'web') return () => {};
  const sub = Notifications.addNotificationResponseReceivedListener(async (response) => {
    const { actionIdentifier, notification } = response;
    const data = notification.request.content.data as
      | { medication_id?: number; scheduled_at?: string }
      | undefined;
    if (!data?.medication_id || !data?.scheduled_at) return;

    if (actionIdentifier === 'taken') {
      await upsertDoseLog(data.medication_id, data.scheduled_at, 'taken', isoNow());
    }
  });

  return () => sub.remove();
}
