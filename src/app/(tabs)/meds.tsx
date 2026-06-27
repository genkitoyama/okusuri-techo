import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { EmptyState } from '@/components/EmptyState';
import { MedCard } from '@/components/MedCard';
import { ProfileSwitcher } from '@/components/ProfileSwitcher';
import { listMedicationsByProfile, listProfiles, Medication, Profile } from '@/db/queries';
import { useProfileStore } from '@/store/profile';
import { Colors, Shadow, Spacing } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

export default function MedsScreen() {
  const router = useRouter();
  const selectedProfileId = useProfileStore((s) => s.selectedProfileId);
  const setSelectedProfileId = useProfileStore((s) => s.setSelectedProfileId);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [meds, setMeds] = useState<Medication[]>([]);

  const load = useCallback(async () => {
    const profs = await listProfiles();
    setProfiles(profs);
    const ms = await listMedicationsByProfile(selectedProfileId);
    setMeds(ms);
  }, [selectedProfileId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView edges={['top']} style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>お薬一覧</Text>
        <ProfileSwitcher
          profiles={profiles}
          selectedId={selectedProfileId}
          onSelect={setSelectedProfileId}
        />
        {meds.length === 0 ? (
          <EmptyState
            emoji="💊"
            title="まだお薬がありません"
            caption="右下の＋から最初のお薬を追加しましょう"
          />
        ) : (
          <View style={styles.list}>
            {meds.map((m) => (
              <MedCard key={m.id} med={m} onPress={() => router.push(`/meds/${m.id}`)} />
            ))}
          </View>
        )}
      </ScrollView>

      <Pressable
        onPress={() => router.push('/meds/new')}
        style={({ pressed }) => [styles.fab, Shadow.card, pressed && styles.fabPressed]}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scrollContent: { padding: Spacing.lg, gap: Spacing.lg, paddingBottom: 120 },
  title: { fontFamily: FontFamily.bold, fontSize: 22, color: Colors.text },
  list: { gap: Spacing.sm },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.xl,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabPressed: { opacity: 0.85 },
});
