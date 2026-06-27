import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';

import { MedicationForm, MedicationFormData } from '@/components/MedicationForm';
import {
  deleteMedication,
  getMedication,
  getProfile,
  Medication,
  updateMedication,
} from '@/db/queries';
import {
  cancelMedicationNotifications,
  rescheduleMedicationNotifications,
} from '@/notifications/schedule';
import { Colors } from '@/theme/colors';

export default function EditMedicationScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const medId = Number(id);
  const [med, setMed] = useState<Medication | null>(null);

  useEffect(() => {
    (async () => {
      const m = await getMedication(medId);
      setMed(m);
    })();
  }, [medId]);

  const handleSubmit = async (data: MedicationFormData) => {
    await updateMedication(medId, data);
    const saved = await getMedication(medId);
    if (saved) {
      const profile = await getProfile(saved.profile_id);
      if (profile) {
        await rescheduleMedicationNotifications(saved, profile.name);
      }
    }
    router.back();
  };

  const handleDelete = async () => {
    Alert.alert('このお薬を削除しますか？', '履歴も一緒に削除されます。', [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除',
        style: 'destructive',
        onPress: async () => {
          await cancelMedicationNotifications(medId);
          await deleteMedication(medId);
          router.back();
        },
      },
    ]);
  };

  if (!med) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator color={Colors.primary} />
      </View>
    );
  }

  return (
    <MedicationForm
      initial={{
        name: med.name,
        dose: med.dose,
        interval_days: med.interval_days,
        start_date: med.start_date,
        reminder_time: med.reminder_time,
        color: med.color,
        note: med.note,
        schedule_type: med.schedule_type,
        monthly_day: med.monthly_day,
        weekly_days: med.weekly_days,
      }}
      submitLabel="変更を保存"
      onSubmit={handleSubmit}
      onDelete={handleDelete}
    />
  );
}
