import { Avatar } from "@/components/Avatar";
import { Screen } from "@/components/Screen";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { chatService } from "@/services/chat";
import { presenceService, UserPresence } from "@/services/presence";
import { transcriptionService } from "@/services/transcription";
import { useAuthStore } from "@/store/useAuthStore";
import { Message, User } from "@/types";
import { FlashList } from "@shopify/flash-list";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { ChevronLeft, Search, X } from "lucide-react-native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  KeyboardAvoidingView,
  KeyboardGestureArea,
} from "react-native-keyboard-controller";
import Animated, { FadeInLeft } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ChatInput } from "./ChatInput";
import { MessageBubble, TypingIndicator } from "./MessageBubble";

/**
 * Enhanced ChatRoom Screen
 * Phase 9 Ready: Contextual AI, Smooth Animations, and Atmospheric UI.
 */
export default function ChatRoomScreen() {
  const {
    id: chatId,
    name: paramName,
    avatarUrl: paramAvatarUrl,
  } = useLocalSearchParams<{
    id: string;
    name?: string;
    avatarUrl?: string;
  }>();
  const { user: currentUser } = useAuthStore();
  const { colors } = useTheme();

  const [messages, setMessages] = useState<Message[]>([]);
  const [replyMessage, setReplyMessage] = useState<Message | null>(null);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  // Pagination State
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [partnerStatus, setPartnerStatus] = useState<UserPresence | null>(null);
  const [partnerUser, setPartnerUser] = useState<User | null>(
    paramName
      ? ({ displayName: paramName, avatarUrl: paramAvatarUrl } as User)
      : null,
  );
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);

  // Search State
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const router = useRouter();
  const insets = useSafeAreaInsets();
  const PAGE_SIZE = 25;

  const isInitialMount = useRef(true);
  const processedReadIds = useRef(new Set<string>());
  const processedDeliveredIds = useRef(new Set<string>());

  // 1. Subscribe to messages & Typing status
  useEffect(() => {
    if (!chatId) return;

    const unsubscribeMessages = chatService.subscribeToMessages(
      chatId,
      (newMessages, cursor) => {
        setMessages((prev) => {
          const messageMap = new Map(prev.map((m) => [m.id, m]));

          newMessages.forEach((serverMsg) => {
            // 1. Handle Optimistic Deduplication
            // Find an optimistic message that "matches" this server message
            const optimisticKey = Array.from(messageMap.keys()).find(
              (key) =>
                key.startsWith("optimistic_") &&
                messageMap.get(key)?.text === serverMsg.text &&
                messageMap.get(key)?.senderId === serverMsg.senderId,
            );

            if (optimisticKey) {
              // Replace the optimistic entry with the server entry
              messageMap.delete(optimisticKey);
            }

            // 2. Add or Update the server message (this fixes the AI dots issue)
            messageMap.set(serverMsg.id, serverMsg);
          });

          return Array.from(messageMap.values()).sort(
            (a, b) => a.createdAt - b.createdAt,
          );
        });

        setIsInitialLoading(false);
        if (isInitialMount.current) {
          setLastDoc(cursor);
          isInitialMount.current = false;
        }
      },
      PAGE_SIZE,
    );

    const unsubscribeTyping = chatService.subscribeToTyping(chatId, (uids) => {
      setTypingUsers(uids.filter((uid) => uid !== currentUser?.uid));
    });

    return () => {
      unsubscribeMessages();
      unsubscribeTyping();
    };
  }, [chatId, currentUser?.uid]);

  // 1.1 Subscribe to Partner Presence
  useEffect(() => {
    if (!chatId || !currentUser) return;

    // First fetch the chat to find the partner
    let unsubscribePresence: (() => void) | undefined;

    const initPartner = async () => {
      const chats = await chatService.fetchChats(currentUser.uid);
      const currentChat = chats.find((c) => c.id === chatId);
      if (currentChat) {
        const partnerId = currentChat.participantIds.find(
          (uid) => uid !== currentUser.uid,
        );
        if (partnerId) {
          // Load Profile
          chatService.fetchUserById(partnerId).then(setPartnerUser);

          // Subscribe to Presence
          unsubscribePresence = presenceService.subscribeToUserStatus(
            partnerId,
            (status) => {
              setPartnerStatus(status);
            },
          );
        }
      }
    };

    initPartner();

    return () => {
      if (unsubscribePresence) unsubscribePresence();
    };
  }, [chatId, currentUser]);

  // 1c. Filtered Messages for Search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    return messages.filter((m) =>
      m.text.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [messages, searchQuery]);

  // 1b. Mark as read & delivered when messages load or change
  useEffect(() => {
    if (chatId && currentUser && messages.length > 0) {
      const myId = currentUser.uid;

      // 1. Mark as Delivered
      const undeliveredIds = messages
        .filter(
          (m) =>
            m.senderId !== myId &&
            !m.deliveredTo?.includes(myId) &&
            m.status === "sent" &&
            !processedDeliveredIds.current.has(m.id),
        )
        .map((m) => m.id);

      if (undeliveredIds.length > 0) {
        undeliveredIds.forEach((id) => processedDeliveredIds.current.add(id));
        chatService.markAsDelivered(chatId, undeliveredIds, myId);
      }

      // 2. Mark as Read
      const unreadIds = messages
        .filter(
          (m) =>
            m.senderId !== myId &&
            !m.readBy?.includes(myId) &&
            !processedReadIds.current.has(m.id),
        )
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        unreadIds.forEach((id) => processedReadIds.current.add(id));
        chatService.markAsRead(chatId, myId, unreadIds);
      }
    }
  }, [chatId, currentUser, messages]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore || !lastDoc || !chatId) return;

    setIsLoadingMore(true);
    try {
      const result = await chatService.fetchMoreMessages(
        chatId,
        lastDoc,
        PAGE_SIZE,
      );

      if (result.messages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (result.messages.length > 0) {
        setMessages((prev) => {
          const combined = [...prev, ...result.messages];
          // Filter duplicates just in case
          const unique = Array.from(
            new Map(combined.map((m) => [m.id, m])).values(),
          );
          return unique.sort((a, b) => a.createdAt - b.createdAt);
        });
        setLastDoc(result.lastDoc);
      }
    } catch (error) {
      console.error("Failed to load more messages:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, lastDoc, isLoadingMore, hasMore]);

  // 2. Handle sending messages
  const handleSend = async (
    text: string,
    mediaUrl?: string,
    audioUrl?: string,
    localUri?: string,
  ): Promise<string | undefined> => {
    if (!chatId || !currentUser) return;

    // A. Optimistic Update
    const tempId = `optimistic_${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      chatId,
      text,
      senderId: currentUser.uid,
      senderType: "human",
      type: audioUrl || localUri ? "audio" : mediaUrl ? "image" : "text",
      createdAt: Date.now(),
      status: "sending",
      mediaUrl,
      audioUrl,
      localUri,
      replyToId: replyMessage?.id,
    };

    setMessages((prev) =>
      [...prev, optimisticMsg].sort((a, b) => a.createdAt - b.createdAt),
    );
    setReplyMessage(null);

    // If it's a local audio message, we return early so the caller can handle upload
    if (localUri && !audioUrl) {
      return tempId;
    }

    try {
      await chatService.sendMessage(
        chatId,
        text,
        currentUser.uid,
        "human",
        mediaUrl,
        audioUrl,
        replyMessage?.id,
      );
      return tempId;
    } catch (error) {
      console.error("Failed to send message:", error);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m)),
      );
      return tempId;
    }
  };

  const updateMessageStatus = (
    tempId: string,
    status: "sending" | "sent" | "failed",
  ) => {
    setMessages((prev) =>
      prev.map((m) => (m.id === tempId ? { ...m, status } : m)),
    );
  };

  const handleRetry = useCallback(
    async (message: Message) => {
      if (!message.localUri || !currentUser || !chatId) return;

      updateMessageStatus(message.id, "sending");

      try {
        const transcribedText = await transcriptionService.transcribe(
          message.localUri,
          currentUser.uid,
        );
        const audioUrl = await transcriptionService.uploadAudio(
          message.localUri,
          currentUser.uid,
        );

        await chatService.sendMessage(
          chatId,
          transcribedText,
          currentUser.uid,
          "human",
          undefined,
          audioUrl,
        );
      } catch (err) {
        console.error("Retry failed:", err);
        updateMessageStatus(message.id, "failed");
      }
    },
    [chatId, currentUser],
  );

  const handleSaveEdit = async (messageId: string, newText: string) => {
    if (!chatId || !currentUser) return;

    // Optimistic Update
    setMessages((prev) =>
      prev.map((m) =>
        m.id === messageId ? { ...m, text: newText, editedAt: Date.now() } : m,
      ),
    );
    setEditingMessage(null);

    try {
      await chatService.updateMessage(chatId, messageId, newText);
    } catch (error) {
      console.error("Failed to save edit:", error);
      // Rollback or error handling
    }
  };

  // 3. Handle Reactions
  const handleAddReaction = useCallback(
    async (message: Message, emoji: string) => {
      if (!currentUser || !chatId) return;

      // Optimistic UI Update
      setMessages((prev) =>
        prev.map((m) => {
          if (m.id !== message.id) return m;

          const reactions = { ...(m.reactions || {}) };
          const userList = [...(reactions[emoji] || [])];

          if (userList.includes(currentUser.uid)) {
            reactions[emoji] = userList.filter(
              (uid) => uid !== currentUser.uid,
            );
          } else {
            reactions[emoji] = [...userList, currentUser.uid];
          }

          return { ...m, reactions };
        }),
      );

      // Persistence
      try {
        await chatService.toggleReaction(
          chatId,
          message.id,
          currentUser.uid,
          emoji,
        );
      } catch (error) {
        console.error("Failed to persist reaction:", error);
      }
    },
    [chatId, currentUser],
  );

  // 4. Auto-Pagination on Scroll
  const handleScroll = (event: any) => {
    const { contentOffset } = event.nativeEvent;
    if (
      contentOffset.y < 100 &&
      hasMore &&
      !isLoadingMore &&
      !isInitialMount.current
    ) {
      handleLoadMore();
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.bgPrimary },
          headerTitle: () =>
            isSearchVisible ? (
              <View style={styles.searchHeader}>
                <TextInput
                  autoFocus
                  placeholder="Search messages..."
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.searchInput, { color: colors.textPrimary }]}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>
            ) : (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: `/(main)/chat/[id]/settings`,
                    params: {
                      id: chatId,
                      name: partnerUser?.displayName,
                      avatarUrl: partnerUser?.avatarUrl,
                    },
                  })
                }
                style={styles.headerTitle}
                activeOpacity={0.7}
              >
                <View style={styles.headerProfile}>
                  <Avatar
                    uri={partnerUser?.avatarUrl}
                    size={36}
                    isOnline={partnerStatus?.state === "online"}
                  />
                  <View style={styles.headerText}>
                    <Typography
                      variant="h2"
                      numberOfLines={1}
                      style={styles.titleText}
                    >
                      {partnerUser?.displayName || "Loading..."}
                    </Typography>
                    <Typography
                      variant="caption"
                      color={
                        partnerStatus?.state === "online"
                          ? colors.success
                          : colors.textSecondary
                      }
                    >
                      {presenceService.formatStatus(partnerStatus)}
                    </Typography>
                  </View>
                </View>
              </TouchableOpacity>
            ),
          headerLeft: () => (
            <TouchableOpacity
              onPress={() => {
                if (isSearchVisible) {
                  setIsSearchVisible(false);
                  setSearchQuery("");
                } else {
                  router.back();
                }
              }}
              style={[styles.iconBtn, { zIndex: 100 }]}
              hitSlop={24}
            >
              <ChevronLeft color={colors.textPrimary} />
            </TouchableOpacity>
          ),
          headerRight: () => (
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              {!isSearchVisible && (
                <TouchableOpacity
                  style={[styles.iconBtn, { marginRight: 8 }]}
                  onPress={() => setIsSearchVisible(true)}
                  hitSlop={10}
                >
                  <Search size={22} color={colors.textPrimary} />
                </TouchableOpacity>
              )}
            </View>
          ),
        }}
      />
      <Screen safeArea={false}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 56 : 100}
        >
          <View
            style={[
              styles.container,
              {
                backgroundColor: colors.bgPrimary,
              },
            ]}
          >
            {isInitialLoading && (
              <View style={StyleSheet.absoluteFill}>
                <ActivityIndicator
                  size="large"
                  color={colors.accentBrand}
                  style={{ marginTop: 100 }}
                />
              </View>
            )}

            {/* Subtle Decorative Aura */}
            <View
              style={[
                styles.aura,
                { backgroundColor: colors.accentAI, opacity: 0.03 },
              ]}
              pointerEvents="none"
            />

            <KeyboardGestureArea style={{ flex: 1 }}>
              <FlashList
                data={filteredMessages}
                keyExtractor={(item) => item.id}
                onScroll={handleScroll}
                scrollEventThrottle={16}
                renderItem={({ item }) => (
                  <MessageBubble
                    message={item}
                    searchQuery={searchQuery}
                    onSwipetoReply={setReplyMessage}
                    onEditRequest={setEditingMessage}
                    onRetry={handleRetry}
                    onAddReaction={(msg, emoji) =>
                      handleAddReaction(msg, emoji)
                    }
                  />
                )}
                maintainVisibleContentPosition={{
                  autoscrollToBottomThreshold: 10,
                  startRenderingFromBottom: true,
                }}
                contentContainerStyle={styles.listContent}
                ListHeaderComponent={() => (
                  <View style={styles.loaderContainer}>
                    {hasMore ? (
                      isLoadingMore && (
                        <ActivityIndicator
                          size="small"
                          color={colors.accentBrand}
                        />
                      )
                    ) : (
                      <Typography
                        variant="caption"
                        color={colors.textSecondary}
                        style={{ textAlign: "center" }}
                      >
                        No more messages
                      </Typography>
                    )}
                  </View>
                )}
              />
            </KeyboardGestureArea>

            {/* Reply Preview */}
            {replyMessage && (
              <View
                style={[
                  styles.replyPreview,
                  { backgroundColor: colors.bgSecondary },
                ]}
              >
                <View
                  style={[
                    styles.replySide,
                    {
                      backgroundColor:
                        replyMessage.senderType === "ai"
                          ? colors.accentAI
                          : colors.accentBrand,
                    },
                  ]}
                />
                <View style={styles.replyContent}>
                  <Typography
                    variant="caption"
                    color={
                      replyMessage.senderType === "ai"
                        ? colors.accentAI
                        : colors.accentBrand
                    }
                    style={{ fontWeight: "700" }}
                  >
                    Replying to{" "}
                    {replyMessage.senderType === "ai"
                      ? "Kochanet AI"
                      : replyMessage.senderId === currentUser?.uid
                        ? "You"
                        : "Member"}
                  </Typography>
                  <Typography
                    variant="body"
                    numberOfLines={1}
                    style={{ opacity: 0.8, fontSize: 13 }}
                  >
                    {replyMessage.text}
                  </Typography>
                </View>
                <TouchableOpacity
                  onPress={() => setReplyMessage(null)}
                  style={styles.closeReplyBtn}
                >
                  <X size={16} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            )}

            {typingUsers.length > 0 && (
              <Animated.View
                entering={FadeInLeft.springify()}
                style={styles.typingIndicatorRow}
              >
                <View
                  style={[
                    styles.typingBubble,
                    { backgroundColor: colors.bgSecondary },
                  ]}
                >
                  <TypingIndicator />
                </View>
              </Animated.View>
            )}

            <ChatInput
              chatId={chatId}
              onSend={handleSend}
              updateMessageStatus={updateMessageStatus}
              editingMessage={editingMessage}
              onCancelEdit={() => setEditingMessage(null)}
              onSaveEdit={handleSaveEdit}
            />
          </View>
        </KeyboardAvoidingView>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  aura: {
    position: "absolute",
    top: 150,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
  },
  headerTitle: {
    flex: 1,
    height: "100%",
    justifyContent: "center",
  },
  headerProfile: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    marginLeft: 10,
    justifyContent: "center",
  },
  titleText: {
    maxWidth: 200,
  },
  iconBtn: {
    padding: 8,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
    paddingTop: 8,
  },
  replyPreview: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 16,
    borderRadius: 12,
    marginBottom: -8,
    zIndex: 1,
  },
  replySide: {
    width: 4,
    height: "100%",
    borderRadius: 2,
    marginRight: 12,
  },
  replyContent: {
    flex: 1,
    justifyContent: "center",
  },
  closeReplyBtn: {
    padding: 4,
    marginLeft: 8,
  },
  typingIndicatorRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    alignItems: "flex-start",
  },
  typingBubble: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderBottomLeftRadius: 4,
  },
  loaderContainer: {
    paddingVertical: 16,
    alignItems: "center",
  },
  searchHeader: {
    width: "100%",
    paddingRight: 40,
  },
  searchInput: {
    fontSize: 16,
    fontFamily: "Nunito_400Regular",
    paddingVertical: 8,
  },
});
