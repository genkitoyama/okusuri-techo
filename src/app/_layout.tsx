import {
  MPLUSRounded1c_400Regular,
  MPLUSRounded1c_500Medium,
  MPLUSRounded1c_700Bold,
  useFonts,
} from '@expo-google-fonts/m-plus-rounded-1c';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';

import AsyncStorage from '@react-native-async-storage/async-storage';

import { listProfiles } from '@/db/queries';
import { runMigrations } from '@/db/migrations';
import { setupNotificationResponseListener } from '@/notifications/handler';
import { setupNotifications } from '@/notifications/schedule';
import { Colors } from '@/theme/colors';
import { FontFamily } from '@/theme/typography';

const PROFILES_CACHE_KEY = 'okusuri:profiles-cache';

async function refreshProfilesCache() {
  try {
    const profs = await listProfiles();
    await AsyncStorage.setItem(PROFILES_CACHE_KEY, JSON.stringify(profs));
  } catch (e) {
    console.warn('[bootstrap] profiles cache error', e);
  }
}

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cleanup: (() => void) | undefined;
    (async () => {
      try {
        await runMigrations();
        await refreshProfilesCache();
        await setupNotifications();
        cleanup = setupNotificationResponseListener();
      } catch (e) {
        console.warn('[bootstrap] error:', e);
      } finally {
        setReady(true);
      }
    })();
    return () => cleanup?.();
  }, []);

  const fontReady = fontsLoaded || !!fontError;

  useEffect(() => {
    if (fontError) console.warn('[font] load error:', fontError);
    if (fontReady && ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontReady, ready, fontError]);

  if (!fontReady || !ready) return null;

  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: Colors.background },
          headerTitleStyle: { fontFamily: FontFamily.medium, color: Colors.text },
          headerTintColor: Colors.text,
          contentStyle: { backgroundColor: Colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="meds/new"
          options={{ presentation: 'modal', title: '新しいお薬' }}
        />
        <Stack.Screen
          name="meds/[id]"
          options={{ presentation: 'modal', title: 'お薬を編集' }}
        />
      </Stack>
    </>
  );
}
