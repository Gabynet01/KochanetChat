import { useAuthStore } from "@/store/useAuthStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import { Redirect } from "expo-router";

export default function Index() {
  const { status } = useAuthStore();
  const { hasOnboarded } = usePreferencesStore();

  // 1. Check for first-time usage
  if (!hasOnboarded) {
    return <Redirect href="/(auth)/login" />;
  }

  // 2. Check Authentication
  if (status === "authenticated") {
    return <Redirect href="/(main)/(tabs)" />;
  }

  // 3. Fallback to Login
  return <Redirect href="/(auth)/login" />;
}
