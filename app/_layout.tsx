import { GlobalErrorHandler } from "@/components/GlobalErrorHandler";
import Logo from "@/components/Logo";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { Screen } from "@/components/Screen";
import { useAppBadging } from "@/hooks/useAppBadging";
import { registerForPushNotificationsAsync, usePushNotifications } from "@/hooks/usePushNotifications";
import { useTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth";
import { chatService } from "@/services/chat";
import { presenceService } from "@/services/presence";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import {
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
} from "@expo-google-fonts/nunito";
import { Quicksand_700Bold, useFonts } from "@expo-google-fonts/quicksand";
import { Stack, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useRef } from "react";
import { ActivityIndicator, AppState, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export const unstable_settings = {
  // Ensure any errors in the root are thrown to the nearest error boundary
  initialRouteName: "index",
};

export default function RootLayout() {
  useAppBadging();
  usePushNotifications();

  const [fontsLoaded, fontError] = useFonts({
    Quicksand_700Bold,
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
  });
  const { colors } = useTheme();

  const segments = useSegments();
  const router = useRouter();
  const status = useAuthStore((state) => state.status);
  const setUser = useAuthStore((state) => state.setUser);
  const user = useAuthStore((state) => state.user);

  // Auth Listener Subscription
  useEffect(() => {
    const unsubscribe = authService.subscribeToAuthChanges((user) => {
      setUser(user);
    });
    return unsubscribe;
  }, [setUser]);

  // Presence & Push Notification Registration
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    if (status === "authenticated" && user?.uid) {
      const userId = user.uid;

      // Initialize Presence
      presenceService.initialize(userId);

      // Register for Push Notifications
      registerForPushNotificationsAsync().then((token) => {
        if (token) {
          authService.updatePushToken(userId, token);
        }
      });

      // AppState listener for Re-sync
      const subscription = AppState.addEventListener(
        "change",
        (nextAppState) => {
          if (
            appState.current.match(/inactive|background/) &&
            nextAppState === "active"
          ) {
            console.log("[App] Returned to foreground. Re-syncing...");
            presenceService.initialize(userId);
            chatService.flushOfflineQueue();
            authService.syncUserProfile(user);
            useChatStore.getState().triggerRefresh();
          } else if (
            appState.current === "active" &&
            nextAppState.match(/inactive|background/)
          ) {
            console.log("[App] Moving to background. Setting offline...");
            presenceService.setOnline(userId, false);
          }
          appState.current = nextAppState;
        },
      );

      return () => {
        subscription.remove();
      };
    }
  }, [status, user]);

  // Global Navigation Guard
  useEffect(() => {
    if (!fontsLoaded && !fontError) return;

    const inAuthGroup = segments[0] === "(auth)";
    const isRoot = !segments.length;

    // If not authenticated and trying to access private routes, go to login
    if (status !== "authenticated" && !inAuthGroup && !isRoot) {
      router.replace("/(auth)/login");
    }
    // If authenticated and hanging in auth screens, go to main
    else if (status === "authenticated" && inAuthGroup) {
      router.replace("/(main)/(tabs)");
    }
  }, [status, segments, fontsLoaded, fontError, router]);

  // Hide splash screen when fonts are ready
  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return (
      <Screen>
        <View
          style={{
            alignItems: "center",
            justifyContent: "center",
            gap: 30,
            flex: 1,
          }}
        >
          <Logo size={100} style={{ borderRadius: 999 }} />
          <ActivityIndicator size="large" color={colors.accentBrand} />
        </View>
      </Screen>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <KeyboardProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bgPrimary },
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(main)/(tabs)" />
          <Stack.Screen name="(main)/chat/[id]" />
        </Stack>
        <GlobalErrorHandler />
        <NetworkStatusBanner />
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}
