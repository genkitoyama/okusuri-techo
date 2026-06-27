import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import {
  listAllActiveMedications,
  listMedEvents,
  listProfiles,
  MedEvent,
  Medication,
  Profile,
} from '@/db/queries';
import { Colors, Radius, Shadow, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

type Filter =
  | { type: 'all' }
  | { type: 'profile'; id: number }
  | { type: 'medication'; id: number };

const WEEK_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export default function HistoryScreen() {
  const [events, setEvents] = useState<MedEvent[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);
  const [filter, setFilter] = useState<Filter>({ type: 'all' });
  const [scope, setScope] = useState<'profile' | 'medication'>('profile');

  const load = useCallback(async () => {
    const [profs, ms, list] = await Promise.all([
      listProfiles(),
      listAllActiveMedications(),
      filter.type === 'all'
        ? listMedEvents()
        : filter.type === 'profile'
          ? listMedEvents({ profile_id: filter.id })
          : listMedEvents({ medication_id: filter.id }),
    ]);
    setProfiles(profs);
    setMeds(ms);
    setEvents(list);
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const grouped = useMemo(() => groupByDay(events), [events]);

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>履歴</Text>

        <View style={styles.scopeRow}>
          {(['profile', 'medication'] as const).map((s) => (
            <Pressable
              key={s}
              onPress={() => {
                setScope(s);
                setFilter({ type: 'all' });
              }}
              style={[styles.scopeBtn, scope === s && styles.scopeBtnActive]}
            >
              <Text
                style={[styles.scopeText, scope === s && styles.scopeTextActive]}
              >
                {s === 'profile' ? 'プロファイル別' : 'お薬別'}
              </Text>
            </Pressable>
          ))}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          <FilterChip
            label="すべて"
            active={filter.type === 'all'}
            onPress={() => setFilter({ type: 'all' })}
          />
          {scope === 'profile'
            ? profiles.map((p) => (
                <FilterChip
                  key={p.id}
                  label={`${p.avatar_emoji} ${p.name}`}
                  active={filter.type === 'profile' && filter.id === p.id}
                  onPress={() => setFilter({ type: 'profile', id: p.id })}
                />
              ))
            : meds.map((m) => (
                <FilterChip
                  key={m.id}
                  label={m.name}
                  active={filter.type === 'medication' && filter.id === m.id}
                  onPress={() => setFilter({ type: 'medication', id: m.id })}
                />
              ))}
        </ScrollView>

        {events.length === 0 ? (
          <EmptyState
            emoji="📝"
            title="履歴はまだありません"
            caption="お薬の追加や変更が時系列で記録されます"
          />
        ) : (
          <View style={styles.list}>
            {grouped.map(([day, items]) => (
              <View key={day} style={styles.group}>
                <Text style={styles.dayHeader}>{day}</Text>
                {items.map((e) => (
                  <EventCard key={e.id} event={e} />
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function FilterChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filterChip, active && styles.filterChipActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

function EventCard({ event }: { event: MedEvent }) {
  const date = new Date(event.created_at);
  const meta = formatEvent(event);
  return (
    <View style={[styles.card, Shadow.card]}>
      <Text style={styles.emoji}>{meta.emoji}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.eventTitle}>
          <Text style={styles.medName}>{event.medication_name}</Text>
          <Text>: {meta.text}</Text>
        </Text>
        {meta.detail ? <Text style={styles.detail}>{meta.detail}</Text> : null}
        <Text style={styles.timestamp}>{format(date, 'HH:mm', { locale: ja })}</Text>
      </View>
    </View>
  );
}

function formatEvent(event: MedEvent): { emoji: string; text: string; detail?: string } {
  switch (event.event_type) {
    case 'add':
      return { emoji: '✨', text: '追加' };
    case 'stop':
      return { emoji: '🛑', text: '削除 / 停止' };
    case 'update_dose': {
      const p = parsePayload(event.payload);
      return {
        emoji: '💊',
        text: '量を変更',
        detail: `${p.from ?? '(指定なし)'} → ${p.to ?? '(指定なし)'}`,
      };
    }
    case 'update_interval': {
      const p = parsePayload(event.payload);
      return {
        emoji: '📅',
        text: '間隔を変更',
        detail: `${describeSchedule(p.from)} → ${describeSchedule(p.to)}`,
      };
    }
    case 'update_time': {
      const p = parsePayload(event.payload);
      return {
        emoji: '⏰',
        text: '通知時刻を変更',
        detail: `${p.from ?? ''} → ${p.to ?? ''}`,
      };
    }
    default:
      return { emoji: '📝', text: '変更' };
  }
}

function parsePayload(payload: string | null): any {
  if (!payload) return {};
  try {
    return JSON.parse(payload);
  } catch {
    return {};
  }
}

function describeSchedule(s: any): string {
  if (!s) return '';
  if (s.schedule_type === 'monthly') return `毎月${s.monthly_day}日`;
  if (s.schedule_type === 'weekly') {
    const labels = String(s.weekly_days ?? '')
      .split(',')
      .map((n: string) => WEEK_LABELS[Number(n)])
      .filter(Boolean)
      .join('・');
    return `毎週 ${labels}`;
  }
  return s.interval_days === 1 ? '毎日' : `${s.interval_days}日おき`;
}

function groupByDay(events: MedEvent[]): [string, MedEvent[]][] {
  const map = new Map<string, MedEvent[]>();
  for (const e of events) {
    const d = new Date(e.created_at);
    const key = format(d, 'yyyy/M/d (E)', { locale: ja });
    const arr = map.get(key) ?? [];
    arr.push(e);
    map.set(key, arr);
  }
  return Array.from(map.entries());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: Spacing.xxl * 2 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text },
  scopeRow: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.pill,
    padding: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  scopeBtn: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    alignItems: 'center',
  },
  scopeBtnActive: { backgroundColor: Colors.primary },
  scopeText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.textSub },
  scopeTextActive: { color: '#FFF' },
  filterRow: { gap: Spacing.sm, paddingVertical: 4, paddingRight: Spacing.lg },
  filterChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.card,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontFamily: FontFamily.medium, fontSize: 13, color: Colors.text },
  filterTextActive: { color: '#FFF' },
  list: { gap: Spacing.lg },
  group: { gap: Spacing.sm },
  dayHeader: {
    fontFamily: FontFamily.bold,
    fontSize: 14,
    color: Colors.textSub,
    paddingLeft: 4,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.md,
    alignItems: 'flex-start',
  },
  emoji: { fontSize: 22 },
  eventTitle: { fontFamily: FontFamily.medium, fontSize: 15, color: Colors.text },
  medName: { fontFamily: FontFamily.bold },
  detail: {
    fontFamily: FontFamily.regular,
    fontSize: 13,
    color: Colors.textSub,
    marginTop: 2,
  },
  timestamp: {
    fontFamily: FontFamily.regular,
    fontSize: 11,
    color: Colors.textSub,
    marginTop: 4,
  },
});
