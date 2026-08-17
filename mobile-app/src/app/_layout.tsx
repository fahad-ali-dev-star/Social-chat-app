import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';
import { Stack } from 'expo-router';
import { initSocket } from '../socketStore';
import { useAuthStore } from '../authStore';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe().finally(() => {
      SplashScreen.hideAsync().catch(() => {});
    });
  }, []);

  useEffect(() => {
    if (user) {
      initSocket();
    }
  }, [user]);

  return (
    <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="user/[id]" />
        <Stack.Screen name="admin" />
      </Stack>
    </ThemeProvider>
  );
}
