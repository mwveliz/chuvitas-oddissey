import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
      <Stack screenOptions={{ 
        headerShown: false,
        contentStyle: { backgroundColor: '#7B2CBF' }
      }}>
        <Stack.Screen name="(game)" />
      </Stack>
      <StatusBar style="light" />
    </>
  );
}