import { Screen } from "@/components/Screen";
import { SearchField } from "@/components/SearchField";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { ChatItem } from "@/screens/chat/ChatItem";
import { chatService } from "@/services/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { useChatStore } from "@/store/useChatStore";
import { Chat } from "@/types";
import { FlashList } from "@shopify/flash-list";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import NewChat from "./NewChat";

/**
 * Inbox Screen
 * The primary hub for messaging with AI and human teams.
 */
export default function InboxScreen() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const { user } = useAuthStore();
  const { colors } = useTheme();

  const router = useRouter();

  const loadChats = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await chatService.fetchChats(user.uid);
      setChats(data);
    } catch (e) {
      console.error("Failed to load chats", e);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Real-time subscription to chat list
  const refreshKey = useChatStore((state) => state.refreshKey);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    const unsubscribe = chatService.subscribeToChats(user.uid, (data) => {
      setChats(data);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, refreshKey]);

  // Filter chats based on search query
  const filteredChats = useMemo(() => {
    const q = search.toLowerCase();
    return chats.filter(
      (c) =>
        (c.name ?? "").toLowerCase().includes(q) ||
        (c.lastMessageText ?? "").toLowerCase().includes(q),
    );
  }, [chats, search]);

  return (
    <Screen safeArea={true}>
      <View style={styles.header}>
        <Typography variant="h1">Inbox</Typography>
        <SearchField
          value={search}
          onChangeText={setSearch}
          style={styles.search}
        />
      </View>

      <FlashList
        data={filteredChats}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ChatItem
            chat={item}
            onPress={() =>
              router.push({
                pathname: `/(main)/chat/[id]`,
                params: { id: item.id, name: item.name },
              })
            }
          />
        )}
        // Note: estimatedItemSize is deprecated in FlashList v2
        onRefresh={loadChats}
        refreshing={isLoading}
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.empty}>
              <Typography variant="body" color={colors.textSecondary}>
                No conversations found.
              </Typography>
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
      />

      <NewChat />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
  },
  search: {
    marginTop: 16,
  },
  listContent: {
    paddingBottom: 100, // Space for FAB
  },
  empty: {
    padding: 40,
    alignItems: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
});
