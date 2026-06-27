import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import type { WidgetConfigurationScreenProps } from 'react-native-android-widget';

import { runMigrations } from '@/db/migrations';
import { listProfiles, Profile } from '@/db/queries';
import { Colors, Radius, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';
import { OkusuriMediumWidget } from './OkusuriMediumWidget';
import { OkusuriSmallWidget } from './OkusuriSmallWidget';
import { loadWidgetDataForWidget, setWidgetProfile } from './utils';

const FALLBACK_PROFILES: Profile[] = [
  {
    id: 1,
    name: 'ワンちゃん',
    kind: 'dog',
    avatar_emoji: '🐶',
    photo_uri: null,
    created_at: 0,
  },
  {
    id: 2,
    name: '奥さん',
    kind: 'human',
    avatar_emoji: '👩',
    photo_uri: null,
    created_at: 0,
  },
];

export function WidgetConfigurationScreen({
  widgetInfo,
  setResult,
  renderWidget,
}: WidgetConfigurationScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>(FALLBACK_PROFILES);
  const [selectedId, setSelectedId] = useState<number | null>(
    FALLBACK_PROFILES[0]?.id ?? null
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        await runMigrations();
        const ps = await listProfiles();
        if (ps.length > 0) {
          setProfiles(ps);
          setSelectedId((prev) =>
            prev != null && ps.some((p) => p.id === prev) ? prev : ps[0].id
          );
        }
      } catch (e) {
        console.warn('[widget-config] init error', e);
      }
    })();
  }, []);

  const onOk = async () => {
    setBusy(true);
    try {
      const targetProfile =
        profiles.find((p) => p.id === selectedId) ?? profiles[0];
      if (!targetProfile) {
        console.warn('[widget-config] no profile to save');
        setBusy(false);
        return;
      }
      await setWidgetProfile(widgetInfo.widgetId, targetProfile);

      const Widget =
        widgetInfo.widgetName === 'OkusuriMedium'
          ? OkusuriMediumWidget
          : OkusuriSmallWidget;
      try {
        const data = await loadWidgetDataForWidget(widgetInfo.widgetId);
        renderWidget(<Widget data={data} />);
      } catch (renderErr) {
        console.warn('[widget-config] render error', renderErr);
        renderWidget(
          <Widget
            data={{
              profile: targetProfile,
              doses: [],
              takenCount: 0,
            }}
          />
        );
      }
      setResult('ok');
    } catch (e) {
      console.warn('[widget-config] save error', e);
      setBusy(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>このウィジェットに表示する人を選んでください</Text>

      <View style={styles.list}>
        {profiles.map((p) => {
          const active = p.id === selectedId;
          return (
            <Pressable
              key={p.id}
              onPress={() => setSelectedId(p.id)}
              style={[styles.row, active && styles.rowActive]}
            >
              {p.photo_uri ? (
                <Image source={{ uri: p.photo_uri }} style={styles.avatar} />
              ) : (
                <View style={styles.emojiBox}>
                  <Text style={styles.emoji}>{p.avatar_emoji}</Text>
                </View>
              )}
              <Text style={styles.name}>{p.name}</Text>
              <View
                style={[styles.radio, active && styles.radioActive]}
              />
            </Pressable>
          );
        })}
      </View>

      <View style={styles.actions}>
        <Pressable
          style={styles.btnSecondary}
          onPress={() => setResult('cancel')}
        >
          <Text style={styles.btnSecondaryText}>キャンセル</Text>
        </Pressable>
        <Pressable
          style={[styles.btnPrimary, busy && { opacity: 0.5 }]}
          onPress={onOk}
          disabled={busy}
        >
          <Text style={styles.btnPrimaryText}>{busy ? '保存中…' : '配置する'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  title: {
    fontFamily: FontFamily.bold,
    fontSize: 16,
    color: Colors.text,
    marginTop: Spacing.xl,
    textAlign: 'center',
  },
  list: { gap: Spacing.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  rowActive: { borderColor: Colors.primary, backgroundColor: '#FFFFFF' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  emojiBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: { fontSize: 24 },
  name: {
    fontFamily: FontFamily.medium,
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.border,
  },
  radioActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  actions: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginTop: 'auto',
    marginBottom: Spacing.xl,
  },
  btnSecondary: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: Colors.text,
  },
  btnPrimary: {
    flex: 1,
    padding: Spacing.md,
    borderRadius: Radius.lg,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  btnPrimaryText: {
    fontFamily: FontFamily.medium,
    fontSize: 15,
    color: '#FFFFFF',
  },
});
