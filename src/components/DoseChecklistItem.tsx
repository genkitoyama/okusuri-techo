import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DoseLog, Medication } from '@/db/queries';
import { Colors, Radius, Shadow, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Props = {
  med: Medication;
  log: DoseLog | null;
  timeKey: string;
  onToggle: () => void;
};

export function DoseChecklistItem({ med, log, timeKey, onToggle }: Props) {
  const taken = log?.status === 'taken';
  return (
    <Pressable
      onPress={onToggle}
      style={({ pressed }) => [styles.row, Shadow.card, pressed && styles.pressed]}
    >
      <View
        style={[
          styles.checkbox,
          {
            borderColor: med.color,
            backgroundColor: taken ? med.color : 'transparent',
          },
        ]}
      >
        {taken ? <Ionicons name="checkmark" size={18} color="#FFF" /> : null}
      </View>
      <View style={styles.body}>
        <Text style={[styles.name, taken && styles.takenName]}>{med.name}</Text>
        <Text style={styles.meta}>
          {timeKey}
          {med.dose ? ` ・ ${med.dose}` : ''}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.md,
  },
  pressed: { opacity: 0.7 },
  checkbox: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1 },
  name: { fontFamily: FontFamily.medium, fontSize: 16, color: Colors.text },
  takenName: { color: Colors.textSub, textDecorationLine: 'line-through' },
  meta: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 2,
  },
});
