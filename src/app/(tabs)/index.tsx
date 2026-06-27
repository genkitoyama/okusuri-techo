import { addDays, endOfDay, format, isSameDay, startOfDay } from 'date-fns';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DoseChecklistItem } from '@/components/DoseChecklistItem';
import { EmptyState } from '@/components/EmptyState';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import {
  clearDoseLog,
  DoseLog,
  listDoseLogsForProfileInRange,
  listMedicationsByProfile,
  listProfiles,
  Medication,
  Profile,
  upsertDoseLog,
} from '@/db/queries';
import { useProfileStore } from '@/store/profile';
import { Colors, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { isoNow, jpDateLong } from '@/utils/date';
import { expandScheduleForMedication } from '@/utils/schedule';

type DoseEntry = {
  med: Medication;
  date: Date;
  isoKey: string;
  timeKey: string;
  log: DoseLog | null;
};

export default function HomeScreen() {
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const setSelectedProfileId = useProfileStore((s) => s.setSelectedProfileId);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [today, setToday] = useState<DoseEntry[]>([]);
  const [tomorrow, setTomorrow] = useState<DoseEntry[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const profs = await listProfiles();
    setProfiles(profs);
    const targetId =
      profs.find((p) => p.id === selectedProfileId)?.id ?? profs[0]?.id ?? selectedProfileId;
    if (targetId !== selectedProfileId) setSelectedProfileId(targetId);

    const meds = await listMedicationsByProfile(targetId);
    const now = new Date();
    const todayStart = startOfDay(now);
    const tomorrowEnd = endOfDay(addDays(now, 1));

    const logs = await listDoseLogsForProfileInRange(
      targetId,
      `${format(todayStart, 'yyyy-MM-dd')}T00:00`,
      `${format(tomorrowEnd, 'yyyy-MM-dd')}T23:59`
    );
    const logKey = (mid: number, iso: string) => `${mid}|${iso}`;
    const logMap = new Map(logs.map((l) => [logKey(l.medication_id, l.scheduled_at), l]));

    const todayList: DoseEntry[] = [];
    const tomorrowList: DoseEntry[] = [];
    const tomorrowDate = addDays(now, 1);

    for (const m of meds) {
      const doses = expandScheduleForMedication(m, todayStart, tomorrowEnd);
      for (const d of doses) {
        const entry: DoseEntry = {
          med: m,
          date: d.date,
          isoKey: d.isoKey,
          timeKey: d.timeKey,
          log: logMap.get(logKey(m.id, d.isoKey)) ?? null,
        };
        if (isSameDay(d.date, now)) todayList.push(entry);
        else if (isSameDay(d.date, tomorrowDate)) tomorrowList.push(entry);
      }
    }
    todayList.sort((a, b) => a.date.getTime() - b.date.getTime());
    tomorrowList.sort((a, b) => a.date.getTime() - b.date.getTime());
    setToday(todayList);
    setTomorrow(tomorrowList);
  }, [selectedProfileId, setSelectedProfileId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onToggle = async (entry: DoseEntry) => {
    if (entry.log?.status === 'taken') {
      await clearDoseLog(entry.med.id, entry.isoKey);
    } else {
      await upsertDoseLog(entry.med.id, entry.isoKey, 'taken', isoNow());
    }
    await load();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const now = new Date();
  const totalToday = today.length;
  const takenToday = today.filter((e) => e.log?.status === 'taken').length;

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.primary}
          />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>こんにちは ☀️</Text>
          <Text style={styles.dateLine}>{jpDateLong(now)}</Text>
        </View>

        <ProfileSwitcher
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
        />

        <Section
          title="今日のお薬"
          right={totalToday > 0 ? `${takenToday} / ${totalToday}` : undefined}
        >
          {today.length === 0 ? (
            <EmptyState
              emoji="🌿"
              title="今日のお薬はありません"
              caption="のんびり過ごしましょう"
            />
          ) : (
            <View style={styles.list}>
              {today.map((e) => (
                <DoseChecklistItem
                  key={`${e.med.id}-${e.isoKey}`}
                  med={e.med}
                  log={e.log}
                  timeKey={e.timeKey}
                  onToggle={() => onToggle(e)}
                />
              ))}
            </View>
          )}
        </Section>

        {tomorrow.length > 0 ? (
          <Section title="明日のお薬">
            <View style={styles.list}>
              {tomorrow.map((e) => (
                <DoseChecklistItem
                  key={`${e.med.id}-${e.isoKey}`}
                  med={e.med}
                  log={e.log}
                  timeKey={e.timeKey}
                  onToggle={() => onToggle(e)}
                />
              ))}
            </View>
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  right,
  children,
}: {
  title: string;
  right?: string;
  children: ReactNode;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {right ? <Text style={styles.sectionRight}>{right}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  header: { gap: 4 },
  greeting: { fontFamily: FontFamily.bold, fontSize: 26, color: Colors.text },
  dateLine: { fontFamily: FontFamily.regular, fontSize: 14, color: Colors.textSub },
  section: { gap: Spacing.sm },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  sectionTitle: { fontFamily: FontFamily.bold, fontSize: 18, color: Colors.text },
  sectionRight: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.primaryDark },
  list: { gap: Spacing.sm },
});
