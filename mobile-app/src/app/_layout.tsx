import React, { Component, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, LogBox } from 'react-native';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import * as SplashScreen from 'expo-splash-screen';
import { Stack } from 'expo-router';
import { initSocket } from '../socketStore';
import { useAuthStore } from '../authStore';

LogBox.ignoreLogs(['Video component from `expo-av` is deprecated', 'Video component from expo-av is deprecated']);

try {
  SplashScreen.preventAutoHideAsync().catch(() => {});
} catch (e) {}

class RootErrorBoundary extends Component<{ children: React.ReactNode }, { hasError: boolean; error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: any) {
    return { hasError: true, error };
  }

  componentDidCatch(error: any, errorInfo: any) {
    console.error("Root error boundary caught exception:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      const errMsg = String(this.state.error?.message || this.state.error || "Unknown error");
      const errStack = String(this.state.error?.stack || "").slice(0, 600);
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>🐝 Buzz Chat — Crash</Text>
          <Text style={styles.errorSub}>Something went wrong while launching.</Text>
          <Text style={styles.errorDetails}>{errMsg}</Text>
          <Text style={styles.errorStack}>{errStack}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={styles.retryBtnText}>Reload App</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const user = useAuthStore((s) => s.user);
  const fetchMe = useAuthStore((s) => s.fetchMe);

  useEffect(() => {
    fetchMe()
      .catch(() => {})
      .finally(() => {
        try {
          SplashScreen.hideAsync().catch(() => {});
        } catch (e) {}
      });
  }, []);

  useEffect(() => {
    if (user) {
      try {
        initSocket().catch(() => {});
      } catch (e) {}
    }
  }, [user]);

  return (
    <RootErrorBoundary>
      <ThemeProvider value={colorScheme === 'light' ? DefaultTheme : DarkTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="chat/[id]" />
          <Stack.Screen name="user/[id]" />
          <Stack.Screen name="admin" />
        </Stack>
      </ThemeProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  errorSub: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorDetails: {
    fontSize: 12,
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 8,
  },
  errorStack: {
    fontSize: 10,
    color: "#94a3b8",
    textAlign: "left",
    marginBottom: 24,
    fontFamily: "monospace",
    paddingHorizontal: 8,
  },
  retryBtn: {
    backgroundColor: '#6366f1',
    paddingVertical: 14,
    paddingHorizontal: 28,
    borderRadius: 12,
  },
  retryBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
