import * as Notifications from 'expo-notifications';
import { useFocusEffect } from 'expo-router';
import { ReactNode, useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '@/components/Button';
import { ProfileEditRow } from '@/components/ProfileEditRow';
import { listProfiles, Profile, updateProfile } from '@/db/queries';
import {
  ensureNotificationPermission,
  refreshAllNotifications,
} from '@/notifications/schedule';
import { Colors, Radius, Shadow, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

export default function SettingsScreen() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [permGranted, setPermGranted] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    const p = await listProfiles();
    setProfiles(p);
    const status = await Notifications.getPermissionsAsync();
    setPermGranted(status.granted);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRequestPermission = async () => {
    const ok = await ensureNotificationPermission();
    setPermGranted(ok);
    if (!ok) {
      Alert.alert(
        '権限が必要です',
        '端末の設定からこのアプリの通知を許可してください。'
      );
    }
  };

  const onRefreshNotifications = async () => {
    setRefreshing(true);
    try {
      await refreshAllNotifications();
      Alert.alert('完了', '通知をすべて再登録しました。');
    } catch (e) {
      Alert.alert('エラー', '通知の再登録に失敗しました。');
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>設定</Text>

        <Section title="プロファイル">
          {profiles.map((p, i) => (
            <View key={p.id}>
              {i > 0 ? <View style={styles.divider} /> : null}
              <ProfileEditRow
                profile={p}
                onSave={async (name, emoji, photo_uri) => {
                  await updateProfile(p.id, name, emoji, photo_uri);
                  try {
                    const all = await listProfiles();
                    const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
                    await AsyncStorage.setItem('okusuri:profiles-cache', JSON.stringify(all));
                  } catch {}
                  await load();
                }}
              />
            </View>
          ))}
        </Section>

        <Section title="通知">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>通知の権限</Text>
            <Text
              style={[
                styles.rowValue,
                { color: permGranted ? Colors.success : Colors.danger },
              ]}
            >
              {permGranted === null ? '...' : permGranted ? '許可済み' : '未許可'}
            </Text>
          </View>
          {!permGranted ? (
            <Button label="通知を許可する" onPress={onRequestPermission} />
          ) : null}
          <Button
            label={refreshing ? '再登録中…' : '通知を再登録する'}
            variant="secondary"
            disabled={refreshing}
            onPress={onRefreshNotifications}
          />
          <Text style={styles.note}>
            通知が来なくなった場合や、薬を編集した後に「再登録」してください。
          </Text>
        </Section>

        <Section title="アプリについて">
          <View style={styles.row}>
            <Text style={styles.rowLabel}>お薬手帳</Text>
            <Text style={styles.rowValueDefault}>v1.3.1</Text>
          </View>
          <Text style={styles.note}>
            愛犬と奥さんの服薬を、可愛らしくシンプルに管理するアプリです 🐾
          </Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={[styles.sectionBody, Shadow.card]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    paddingBottom: Spacing.xxl * 2,
  },
  title: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text },
  section: { gap: Spacing.sm },
  sectionTitle: {
    fontFamily: FontFamily.medium,
    fontSize: 13,
    color: Colors.textSub,
    paddingLeft: 4,
  },
  sectionBody: {
    backgroundColor: Colors.card,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  divider: { height: 1, backgroundColor: Colors.border, marginVertical: Spacing.sm },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  rowLabel: { fontFamily: FontFamily.regular, fontSize: 15, color: Colors.text },
  rowValue: { fontFamily: FontFamily.medium, fontSize: 14 },
  rowValueDefault: { fontFamily: FontFamily.medium, fontSize: 14, color: Colors.textSub },
  note: {
    fontFamily: FontFamily.regular,
    fontSize: 12,
    color: Colors.textSub,
    lineHeight: 18,
    marginTop: Spacing.xs,
  },
});
