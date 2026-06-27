import { addDays, endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  DoseLog,
  listDoseLogsForProfileInRange,
  listMedicationsByProfile,
  Medication,
} from '@/db/queries';
import { useProfileStore } from '@/store/profile';
import { Colors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { expandSchedule } from '@/utils/schedule';

LocaleConfig.locales['ja'] = {
  monthNames: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ],
  monthNamesShort: [
    '1月', '2月', '3月', '4月', '5月', '6月',
    '7月', '8月', '9月', '10月', '11月', '12月',
  ],
  dayNames: ['日曜日', '月曜日', '火曜日', '水曜日', '木曜日', '金曜日', '土曜日'],
  dayNamesShort: ['日', '月', '火', '水', '木', '金', '土'],
  today: '今日',
};
LocaleConfig.defaultLocale = 'ja';

type DayDetail = {
  med: Medication;
  isoKey: string;
  timeKey: string;
  log: DoseLog | null;
};

export default function CalendarScreen() {
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [meds, setMeds] = useState<Medication[]>([]);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const load = useCallback(async () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const rangeStart = subDays(monthStart, 5);
    const rangeEnd = addDays(monthEnd, 5);

    const ms = await listMedicationsByProfile(selectedProfileId);
    setMeds(ms);
    const ls = await listDoseLogsForProfileInRange(
      selectedProfileId,
      `${format(rangeStart, 'yyyy-MM-dd')}T00:00`,
      `${format(rangeEnd, 'yyyy-MM-dd')}T23:59`
    );
    setLogs(ls);
  }, [currentMonth, selectedProfileId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const markedDates = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const acc: Record<string, { dots: Array<{ key: string; color: string }> }> = {};
    for (const m of meds) {
      const doses = expandSchedule(
        m.start_date,
        m.reminder_time,
        m.interval_days,
        subDays(monthStart, 5),
        addDays(monthEnd, 5)
      );
      const seen = new Set<string>();
      for (const d of doses) {
        const key = `${d.dateKey}-${m.id}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!acc[d.dateKey]) acc[d.dateKey] = { dots: [] };
        acc[d.dateKey].dots.push({ key: String(m.id), color: m.color });
      }
    }
    return acc;
  }, [meds, currentMonth]);

  const dayDetails = useMemo<DayDetail[]>(() => {
    if (!selectedDate) return [];
    const out: DayDetail[] = [];
    const dayStart = new Date(`${selectedDate}T00:00:00`);
    const dayEnd = new Date(`${selectedDate}T23:59:59`);
    const logKey = (mid: number, iso: string) => `${mid}|${iso}`;
    const logMap = new Map(logs.map((l) => [logKey(l.medication_id, l.scheduled_at), l]));
    for (const m of meds) {
      const doses = expandSchedule(
        m.start_date,
        m.reminder_time,
        m.interval_days,
        dayStart,
        dayEnd
      );
      for (const d of doses) {
        out.push({
          med: m,
          isoKey: d.isoKey,
          timeKey: d.timeKey,
          log: logMap.get(logKey(m.id, d.isoKey)) ?? null,
        });
      }
    }
    out.sort((a, b) => a.timeKey.localeCompare(b.timeKey));
    return out;
  }, [selectedDate, meds, logs]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>カレンダー</Text>
      </View>
      <Calendar
        markingType="multi-dot"
        markedDates={markedDates}
        onMonthChange={(d) => setCurrentMonth(new Date(d.timestamp))}
        onDayPress={(d) => setSelectedDate(d.dateString)}
        theme={{
          backgroundColor: Colors.background,
          calendarBackground: Colors.background,
          textSectionTitleColor: Colors.textSub,
          dayTextColor: Colors.text,
          todayTextColor: Colors.primary,
          monthTextColor: Colors.text,
          textDayFontFamily: FontFamily.medium,
          textMonthFontFamily: FontFamily.bold,
          textDayHeaderFontFamily: FontFamily.medium,
          arrowColor: Colors.primary,
          textDayFontSize: 14,
          textMonthFontSize: 16,
          textDayHeaderFontSize: 12,
        }}
      />

      <Modal
        visible={!!selectedDate}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedDate(null)}
      >
        <Pressable style={styles.modalBg} onPress={() => setSelectedDate(null)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {selectedDate
                ? format(new Date(`${selectedDate}T00:00:00`), 'M月d日 (E)', { locale: ja })
                : ''}
            </Text>
            {dayDetails.length === 0 ? (
              <Text style={styles.empty}>この日のお薬はありません</Text>
            ) : (
              dayDetails.map((d) => (
                <View key={`${d.med.id}-${d.isoKey}`} style={styles.detailRow}>
                  <View style={[styles.dot, { backgroundColor: d.med.color }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailName}>{d.med.name}</Text>
                    <Text style={styles.detailMeta}>
                      {d.timeKey}
                      {d.med.dose ? ` ・ ${d.med.dose}` : ''}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      {
                        backgroundColor:
                          d.log?.status === 'taken' ? Colors.success : Colors.border,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusText,
                        { color: d.log?.status === 'taken' ? '#FFF' : Colors.textSub },
                      ]}
                    >
                      {d.log?.status === 'taken' ? 'あげた' : '未'}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { padding: Spacing.lg },
  title: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text },
  modalBg: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: Radius.xl,
    borderTopRightRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    minHeight: 250,
    paddingBottom: Spacing.xxl,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.border,
    borderRadius: 2,
    alignSelf: 'center',
  },
  sheetTitle: {
    fontFamily: FontFamily.bold,
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
  },
  empty: {
    fontFamily: FontFamily.regular,
    fontSize: 14,
    color: Colors.textSub,
    textAlign: 'center',
    marginTop: Spacing.xl,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: Radius.md,
    padding: Spacing.md,
    gap: Spacing.md,
  },
  dot: { width: 6, height: 32, borderRadius: 3 },
  detailName: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.text },
  detailMeta: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSub,
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  statusText: { fontFamily: FontFamily.medium, fontSize: 12 },
});
