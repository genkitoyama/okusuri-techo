import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Medication } from '@/db/queries';
import { Colors, Radius, Shadow, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { describeSchedule } from '@/utils/schedule';

type Props = {
  med: Medication;
  onPress?: () => void;
};

export function MedCard({ med, onPress }: Props) {
  const scheduleLabel = describeSchedule(med);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, Shadow.card, pressed && styles.pressed]}
    >
      <View style={[styles.dot, { backgroundColor: med.color }]} />
      <View style={styles.body}>
        <Text style={styles.name}>{med.name}</Text>
        <Text style={styles.meta}>
          {scheduleLabel} ・ {med.reminder_time}
          {med.dose ? ` ・ ${med.dose}` : ''}
        </Text>
        {med.note ? (
          <Text style={styles.note} numberOfLines={1}>
            {med.note}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    gap: Spacing.md,
  },
  pressed: { opacity: 0.7 },
  dot: { width: 8, height: 44, borderRadius: 4 },
  body: { flex: 1 },
  name: { fontFamily: FontFamily.bold, fontSize: 16, color: Colors.text },
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 4,
  },
  note: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 6,
  },
});
