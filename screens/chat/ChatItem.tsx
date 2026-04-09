import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar } from "../../components/Avatar";
import { Typography } from "../../components/Typography";
import { useTheme } from "../../hooks/useTheme";
import { useChatParticipant } from "../../hooks/useChatParticipant";
import { useAuthStore } from "../../store/useAuthStore";
import { Chat } from "../../types";
import { formatRelativeTime } from "../../utils/date";

interface ChatItemProps {
  chat: Chat;
  onPress: () => void;
}

/**
 * ChatItem Component
 * Renders a single chat row for the inbox list.
 */
export const ChatItem: React.FC<ChatItemProps> = ({ chat, onPress }) => {
  const { colors } = useTheme();
  const { user } = useAuthStore();
  const { partner } = useChatParticipant(chat);

  const unreadCount = user ? chat.unreadCounts?.[user.uid] || 0 : 0;
  
  // Use partner details for 1-on-1 chats if available, otherwise fallback to chat name
  const displayName = !chat.isGroup && partner ? partner.displayName : chat.name;
  const displayAvatar = !chat.isGroup && partner ? partner.avatarUrl : undefined;
  const isOnline = !chat.isGroup && partner ? partner.isOnline : false;

  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      style={[styles.container, { borderBottomColor: colors.borderColor }]}
    >
      <Avatar
        size={56}
        name={displayName}
        uri={displayAvatar}
        isOnline={isOnline}
      />

      <View style={styles.content}>
        <View style={styles.header}>
          <Typography variant="h2" numberOfLines={1} style={styles.title}>
            {displayName}
          </Typography>
          <Typography variant="caption">
            {formatRelativeTime(chat.lastUpdated)}
          </Typography>
        </View>

        <View style={styles.footer}>
          <Typography
            variant="body"
            numberOfLines={1}
            style={[styles.lastMessage, { color: colors.textSecondary }]}
          >
            {chat.lastMessageText || "No messages yet"}
          </Typography>

          {unreadCount > 0 && (
            <View
              style={[styles.badge, { backgroundColor: colors.accentBrand }]}
            >
              <Typography variant="caption" style={styles.badgeText}>
                {unreadCount}
              </Typography>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    // borderBottomWidth: 1, // Optional: for a cleaner look, use separator in FlashList
  },
  content: {
    flex: 1,
    marginLeft: 16,
    justifyContent: "center",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: 4,
  },
  title: {
    flex: 1,
    marginRight: 8,
    fontSize: 17,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lastMessage: {
    flex: 1,
    marginRight: 12,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: "#fff",
    fontSize: 11,
    fontFamily: "Nunito_700Bold",
  },
});
