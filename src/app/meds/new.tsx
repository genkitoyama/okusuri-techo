import { useRouter } from 'expo-router';
import { Alert } from 'react-native';

import { MedicationForm, MedicationFormData } from '@/components/MedicationForm';
import { createMedication, getMedication, getProfile } from '@/db/queries';
import {
  ensureNotificationPermission,
  scheduleMedicationNotifications,
} from '@/notifications/schedule';
import { useProfileStore } from '@/store/profile';

export default function NewMedicationScreen() {
  const router = useRouter();
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);

  const handleSubmit = async (data: MedicationFormData) => {
    const granted = await ensureNotificationPermission();
    const id = await createMedication({
      profile_id: selectedProfileId,
      ...data,
    });
    const saved = await getMedication(id);
    const profile = await getProfile(selectedProfileId);
    if (granted && saved && profile) {
      await scheduleMedicationNotifications(saved, profile.name);
    } else if (!granted) {
      Alert.alert(
        '通知が許可されていません',
        'リマインダーを受け取るには、端末の設定からこのアプリの通知を許可してください。'
      );
    }
    router.back();
  };

  return <MedicationForm onSubmit={handleSubmit} submitLabel="保存する" />;
}
