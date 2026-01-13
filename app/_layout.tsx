import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import * as SplashScreen from 'expo-splash-screen';
import { MusicControl } from '@/components/MusicControl';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    // Hide splash screen after component mount (simulation of asset load)
    const timer = setTimeout(async () => {
      try {
        await SplashScreen.hideAsync();
      } catch (e) {
        console.warn('Error hiding splash screen:', e);
      }
    }, 2000); // 2 seconds delay to ensure visibility
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <Stack screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#7B2CBF' }
      }}>
        <Stack.Screen name="(game)" />
      </Stack>
      <StatusBar style="light" />
      <MusicControl />
    </>
  );
}