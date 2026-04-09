import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { chatService } from "@/services/chat";
import { Chat, User } from "@/types";
import * as Haptics from "expo-haptics";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import {
  Bell,
  ChevronLeft,
  LogOut,
  Share2,
  Shield,
  UserPlus,
} from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

export default function ChatSettingsScreen() {
  const { id: chatId, name: paramName, avatarUrl: paramAvatarUrl } = useLocalSearchParams<{ 
    id: string; 
    name?: string; 
    avatarUrl?: string; 
  }>();
  const [chat, setChat] = useState<Chat | null>(
    paramName ? { id: chatId, name: paramName } as Chat : null
  );
  const [members, setMembers] = useState<User[]>(
    paramName ? [{ uid: 'temp', displayName: paramName, avatarUrl: paramAvatarUrl } as User] : []
  );
  const { colors } = useTheme();
  const router = useRouter();

  const loadDetails = React.useCallback(async () => {
    if (!chatId) return;
    
    // Fetch individual chat details
    const currentChat = await chatService.fetchChatById(chatId);
    if (currentChat) {
      setChat(currentChat);

      // Map participant IDs to user profiles
      const userPromises = currentChat.participantIds.map(uid => 
        chatService.fetchUserById(uid)
      );
      const userResults = await Promise.all(userPromises);
      const participants = userResults.filter((u): u is User => u !== null);
      setMembers(participants);
    }
  }, [chatId]);

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Join our Kochanet chat: ${chat?.name || "Conversation"}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (chatId) {
      loadDetails();
    }
  }, [chatId, loadDetails]);

  return (
    <Screen safeArea={false}>
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Chat Info",
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.iconBtn}
            >
              <ChevronLeft color={colors.textPrimary} />
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Avatar
            size={100}
            name={chat?.name}
            uri={members.length === 1 ? members[0].avatarUrl : undefined}
          />
          <Typography variant="h1" style={styles.chatName}>
            {chat?.name || "Chat Name"}
          </Typography>
          <Typography variant="caption" color={colors.textSecondary}>
            {members.length} Members
          </Typography>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.bgSecondary },
              ]}
            >
              <Share2 size={20} color={colors.textPrimary} />
            </View>
            <Typography variant="caption">Share</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.bgSecondary },
              ]}
            >
              <Bell size={20} color={colors.textPrimary} />
            </View>
            <Typography variant="caption">Mute</Typography>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <View
              style={[
                styles.iconCircle,
                { backgroundColor: colors.bgSecondary },
              ]}
            >
              <Shield size={20} color={colors.textPrimary} />
            </View>
            <Typography variant="caption">Privacy</Typography>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Typography variant="h2">Members</Typography>
            <TouchableOpacity
              style={styles.addBtn}
              onPress={() =>
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
              }
            >
              <UserPlus size={18} color={colors.accentBrand} />
              <Typography
                variant="body"
                color={colors.accentBrand}
                style={{ marginLeft: 4 }}
              >
                Add
              </Typography>
            </TouchableOpacity>
          </View>

          {members.map((member) => (
            <View key={member.uid} style={styles.userItem}>
              <Avatar
                uri={member.avatarUrl}
                size={40}
                isOnline={member.isOnline}
              />
              <View style={styles.userInfo}>
                <Typography variant="body" style={styles.userName}>
                  {member.displayName}
                </Typography>
                <Typography variant="caption" color={colors.textSecondary}>
                  {member.email}
                </Typography>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.logoutBtn, { borderTopColor: colors.borderColor }]}
        >
          <LogOut size={20} color={colors.error} />
          <Typography
            variant="body"
            color={colors.error}
            style={{ marginLeft: 12 }}
          >
            Leave Chat
          </Typography>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingTop: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  chatName: {
    marginTop: 16,
    marginBottom: 4,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 32,
    marginBottom: 40,
  },
  actionBtn: {
    alignItems: "center",
    gap: 8,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 12,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  userInfo: {
    marginLeft: 12,
  },
  userName: {
    fontWeight: "600",
  },
  logoutBtn: {
    marginTop: 40,
    marginHorizontal: 20,
    paddingTop: 24,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  iconBtn: {
    padding: 8,
  },
});
