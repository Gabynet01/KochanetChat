import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { Screen } from "@/components/Screen";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { usePreferencesStore } from "@/store/usePreferencesStore";
import * as Haptics from "expo-haptics";
import { Bell, LogOut, Monitor, Moon, Sun } from "lucide-react-native";
import React from "react";
import {
  Alert,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
} from "react-native";
import EditProfile from "./EditProfile";

export default function ProfileScreen() {
  const { logout, user } = useAuthStore();
  const { colors } = useTheme();
  const { theme, setTheme, notificationsEnabled, setNotificationsEnabled } =
    usePreferencesStore();

  const handleThemeChange = (newTheme: "system" | "light" | "dark") => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTheme(newTheme);
  };

  const handleLogout = () => {
    Alert.alert("Log Out", "Are you sure you want to log out of Kochanet?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Log Out",
        style: "destructive",
        onPress: async () => {
          await authService.logout();
          logout();
        },
      },
    ]);
  };

  return (
    <Screen scrollable contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Avatar
          size={100}
          uri={user?.avatarUrl}
          isOnline={true}
          name={user?.displayName}
        />
        <Typography variant="h1" style={styles.name}>
          {user?.displayName}
        </Typography>
        <Typography variant="caption">{user?.email}</Typography>
        <Typography
          variant="body"
          color={colors.textSecondary}
          style={styles.bio}
        >
          {user?.bio ||
            "No bio yet. Add one to let people know what you're up to."}
        </Typography>

        <EditProfile />
      </View>

      <View style={styles.content}>
        <Typography variant="h2" style={styles.sectionTitle}>
          Preferences
        </Typography>
        <View style={[styles.card, { backgroundColor: colors.bgSecondary }]}>
          {/* Theme Selection */}
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <Monitor size={20} color={colors.textPrimary} />
              <Typography variant="body" style={styles.rowText}>
                Theme
              </Typography>
            </View>
            <View style={styles.themeToggle}>
              {(["system", "light", "dark"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  onPress={() => handleThemeChange(t)}
                  style={[
                    styles.themeBtn,
                    theme === t && {
                      backgroundColor: colors.bgPrimary,
                      shadowColor: "#000",
                      shadowOpacity: 0.1,
                      shadowRadius: 4,
                      elevation: 2,
                    },
                  ]}
                >
                  {t === "system" && (
                    <Monitor
                      size={16}
                      color={
                        theme === t ? colors.accentBrand : colors.textSecondary
                      }
                    />
                  )}
                  {t === "light" && (
                    <Sun
                      size={16}
                      color={
                        theme === t ? colors.accentBrand : colors.textSecondary
                      }
                    />
                  )}
                  {t === "dark" && (
                    <Moon
                      size={16}
                      color={
                        theme === t ? colors.accentBrand : colors.textSecondary
                      }
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notifications Toggle */}
          <View style={[styles.row, { marginTop: 12 }]}>
            <View style={styles.rowLeft}>
              <Bell size={20} color={colors.textPrimary} />
              <Typography variant="body" style={styles.rowText}>
                Notifications
              </Typography>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{
                true: colors.accentBrand,
                false: colors.borderColor,
              }}
            />
          </View>
        </View>
      </View>

      <Button
        title="Log Out"
        onPress={handleLogout}
        variant="outline"
        icon={<LogOut size={18} color={colors.error} />}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 24,
    gap: 24,
  },
  header: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 40,
  },
  name: {
    marginTop: 16,
    marginBottom: 4,
  },
  bio: {
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 20,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 16,
  },
  content: {
    flex: 1,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  card: {
    padding: 16,
    borderRadius: 20,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  rowText: {
    marginLeft: 12,
  },
  themeToggle: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    padding: 2,
  },
  themeBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  devToolsBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 20,
    marginTop: 12,
    marginBottom: 24,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    padding: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingBottom: 40,
  },
  input: {
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    fontSize: 16,
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  modalFooter: {
    flexDirection: "row",
    marginTop: 24,
  },
});
