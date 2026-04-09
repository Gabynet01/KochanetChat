import { Button } from "@/components/Button";
import Logo from "@/components/Logo";
import { Screen } from "@/components/Screen";
import { TextField } from "@/components/TextField";
import { Typography } from "@/components/Typography";
import GoogleIcon from "@/components/icons/GoogleIcon";
import { useTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { useErrorStore } from "@/store/useErrorStore";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
  offlineAccess: true, // Keep this if you need a server auth code, otherwise false is fine
});
export const LoginScreen = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const { setUser } = useAuthStore();
  const { colors } = useTheme();
  const { setError } = useErrorStore();

  const router = useRouter();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        setError("No ID Token received from Google.");
        return;
      }

      const user = await authService.loginWithGoogle(idToken);
      if (user) {
        setUser(user);
        router.replace("/(main)/(tabs)");
      }
    } catch (error) {
      console.error("Native Google Auth Error:", error);
      if (typeof error === "object" && error !== null && "code" in error) {
        const code = String((error as { code?: string }).code);
        if (code === "ASYNC_OP_IN_PROGRESS" || code === "SIGN_IN_CANCELLED") {
          return;
        }
        if (code === "DEVELOPER_ERROR" || code === "10") {
          setError(
            "Google Sign-In is not configured for this debug build. In Firebase Console, add your Android debug SHA-1 fingerprint, then download an updated google-services.json. Run: cd android && ./gradlew signingReport",
          );
          return;
        }
        setError("Google Sign-In failed: " + code);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }

    setIsLoading(true);
    const user = await authService.login(email, password);
    if (user) {
      setUser(user);
      router.replace("/(main)/(tabs)");
    }
    setIsLoading(false);
  };

  return (
    <Screen safeArea={false}>
      <ScrollView contentContainerStyle={styles.scrollContent} bounces={false}>
        <View style={styles.header}>
          <Logo />
          <Typography variant="h1" style={styles.title}>
            Welcome back
          </Typography>
          <Typography variant="caption">
            Login to your Kochanet account
          </Typography>
        </View>

        <View style={styles.form}>
          <TextField
            label="Email Address"
            placeholder="e.g. alice@kochanet.com"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <TextField
            label="Password"
            placeholder="Your secure password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Button
            title="Login"
            onPress={handleLogin}
            isLoading={isLoading}
            style={styles.loginBtn}
          />

          <View style={styles.divider}>
            <View
              style={[styles.line, { backgroundColor: colors.borderColor }]}
            />
            <Typography variant="caption" style={styles.dividerText}>
              or continue with
            </Typography>
            <View
              style={[styles.line, { backgroundColor: colors.borderColor }]}
            />
          </View>

          <View style={styles.socialRow}>
            <Button
              variant="secondary"
              title="Google"
              onPress={handleGoogleLogin}
              style={styles.socialButton}
              icon={<GoogleIcon />}
              isLoading={isLoading}
            />

            {/* <Button
              variant="secondary"
              title="Apple"
              onPress={() => {}}
              style={styles.socialButton}
              icon={<AppleIcon />}
              isLoading={isLoading}
            /> */}
          </View>
        </View>
      </ScrollView>
    </Screen>
  );
};

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    padding: 24,
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  title: {
    marginBottom: 8,
  },
  form: {
    width: "100%",
  },
  error: {
    textAlign: "center",
    marginBottom: 16,
  },
  loginBtn: {
    marginTop: 8,
    marginBottom: 24,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
  },
  line: {
    flex: 1,
    height: 1,
  },
  dividerText: {
    marginHorizontal: 16,
  },
  socialRow: {
    flexDirection: "row",
    gap: 16,
  },
  socialButton: {
    flex: 1,
  },
});
