import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { ReactNode, useState } from 'react';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Colors, MedColors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { jpDateLong, ymd } from '@/utils/date';
import { parseReminderTimes } from '@/utils/schedule';
import { Button } from './Button';

export type MedicationFormData = {
  name: string;
  dose: string | null;
  interval_days: number;
  start_date: string;
  reminder_time: string;
  color: string;
  note: string | null;
};

type Props = {
  initial?: Partial<MedicationFormData>;
  submitLabel?: string;
  onSubmit: (data: MedicationFormData) => Promise<void>;
  onDelete?: () => Promise<void>;
};

const INTERVAL_PRESETS = [1, 2, 3, 4, 5, 6, 7, 14, 30];

export function MedicationForm({
  initial,
  submitLabel = '保存する',
  onSubmit,
  onDelete,
}: Props) {
  const [name, setName] = useState(initial?.name ?? '');
  const [dose, setDose] = useState(initial?.dose ?? '');
  const [intervalDays, setIntervalDays] = useState(initial?.interval_days ?? 1);
  const [startDate, setStartDate] = useState(initial?.start_date ?? ymd(new Date()));
  const [reminderTimes, setReminderTimes] = useState<string[]>(() => {
    const parsed = parseReminderTimes(initial?.reminder_time ?? '');
    return parsed.length ? parsed : ['09:00'];
  });
  const [color, setColor] = useState(initial?.color ?? MedColors[0]);
  const [note, setNote] = useState(initial?.note ?? '');
  const [submitting, setSubmitting] = useState(false);

  const [showDatePicker, setShowDatePicker] = useState(false);
  const [timePickerIndex, setTimePickerIndex] = useState<number | null>(null);

  const startAsDate = new Date(`${startDate}T00:00:00`);
  const canSave = name.trim().length > 0 && reminderTimes.length > 0 && !submitting;

  const handleSave = async () => {
    if (!canSave) return;
    setSubmitting(true);
    try {
      const uniqueTimes = Array.from(new Set(reminderTimes)).sort();
      await onSubmit({
        name: name.trim(),
        dose: dose.trim() || null,
        interval_days: intervalDays,
        start_date: startDate,
        reminder_time: uniqueTimes.join(','),
        color,
        note: note.trim() || null,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const addTime = () => {
    setReminderTimes((prev) => [...prev, '12:00']);
    setTimePickerIndex(reminderTimes.length);
  };

  const removeTime = (index: number) => {
    setReminderTimes((prev) => prev.filter((_, i) => i !== index));
  };

  const onTimePicked = (index: number, d: Date | undefined) => {
    setTimePickerIndex(Platform.OS === 'ios' ? index : null);
    if (!d) return;
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const newTime = `${h}:${m}`;
    setReminderTimes((prev) => prev.map((t, i) => (i === index ? newTime : t)));
  };

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <Field label="お薬の名前">
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="例：抗生剤"
          placeholderTextColor={Colors.textSub}
        />
      </Field>

      <Field label="量(任意)">
        <TextInput
          style={styles.input}
          value={dose}
          onChangeText={setDose}
          placeholder="例：半錠、1錠、5mg"
          placeholderTextColor={Colors.textSub}
        />
      </Field>

      <Field label="何日おき">
        <View style={styles.chipRow}>
          {INTERVAL_PRESETS.map((n) => {
            const active = intervalDays === n;
            return (
              <Pressable
                key={n}
                onPress={() => setIntervalDays(n)}
                style={[
                  styles.chip,
                  active && {
                    backgroundColor: Colors.primary,
                    borderColor: Colors.primary,
                  },
                ]}
              >
                <Text style={[styles.chipText, active && { color: '#FFF' }]}>
                  {n === 1 ? '毎日' : `${n}日おき`}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </Field>

      <Field label="開始日">
        <Pressable style={styles.input} onPress={() => setShowDatePicker(true)}>
          <Text style={styles.inputText}>{jpDateLong(startAsDate)}</Text>
        </Pressable>
        {showDatePicker ? (
          <DateTimePicker
            value={startAsDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            onChange={(_, d) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (d) setStartDate(ymd(d));
            }}
          />
        ) : null}
      </Field>

      <Field label="通知時刻(複数可)">
        <View style={styles.timeList}>
          {reminderTimes.map((t, i) => (
            <View key={`${i}-${t}`} style={styles.timeRow}>
              <Pressable
                style={[styles.input, styles.timeInput]}
                onPress={() => setTimePickerIndex(i)}
              >
                <Ionicons name="time-outline" size={18} color={Colors.textSub} />
                <Text style={styles.inputText}>{t}</Text>
              </Pressable>
              {reminderTimes.length > 1 ? (
                <Pressable onPress={() => removeTime(i)} style={styles.timeDelete}>
                  <Ionicons name="close-circle" size={24} color={Colors.danger} />
                </Pressable>
              ) : null}
              {timePickerIndex === i ? (
                <DateTimePicker
                  value={(() => {
                    const [hh, mm] = t.split(':').map(Number);
                    const d = new Date();
                    d.setHours(hh, mm, 0, 0);
                    return d;
                  })()}
                  mode="time"
                  is24Hour
                  display="spinner"
                  onChange={(_, d) => onTimePicked(i, d ?? undefined)}
                />
              ) : null}
            </View>
          ))}
          <Pressable onPress={addTime} style={styles.addTimeBtn}>
            <Ionicons name="add" size={18} color={Colors.primaryDark} />
            <Text style={styles.addTimeText}>時刻を追加</Text>
          </Pressable>
        </View>
      </Field>

      <Field label="カードの色">
        <View style={styles.chipRow}>
          {MedColors.map((c) => (
            <Pressable
              key={c}
              onPress={() => setColor(c)}
              style={[
                styles.colorChip,
                { backgroundColor: c },
                color === c && styles.colorChipActive,
              ]}
            />
          ))}
        </View>
      </Field>

      <Field label="メモ(任意)">
        <TextInput
          style={[styles.input, styles.multiline]}
          value={note}
          onChangeText={setNote}
          placeholder="食前 / 食後 / 寝る前 など"
          placeholderTextColor={Colors.textSub}
          multiline
        />
      </Field>

      <View style={styles.actions}>
        <Button label={submitLabel} onPress={handleSave} disabled={!canSave} />
        {onDelete ? (
          <Button
            label="このお薬を削除"
            variant="danger"
            onPress={onDelete}
            style={{ marginTop: Spacing.sm }}
          />
        ) : null}
      </View>
    </ScrollView>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  field: { gap: Spacing.sm },
  label: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.text },
  input: {
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: FontFamily.regular,
    fontSize: 15,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  inputText: { fontFamily: FontFamily.regular, fontSize: 15, color: Colors.text },
  multiline: { minHeight: 80, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  chip: {
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  chipText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.text },
  colorChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorChipActive: { borderColor: Colors.text },
  timeList: { gap: Spacing.sm },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeInput: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  timeDelete: { padding: 4 },
  addTimeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: Colors.primary,
    backgroundColor: 'transparent',
  },
  addTimeText: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.primaryDark },
  actions: { marginTop: Spacing.lg },
});
