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
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  KeyboardGestureArea,
  KeyboardStickyView,
} from "react-native-keyboard-controller";
import Animated, { FadeInLeft } from "react-native-reanimated";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
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
  /** Space for absolute composer (multiline input + reply strip + typing + home/nav bar). */
  const listBottomPad = insets.bottom + 220;
  /** Larger window so recent + partner messages usually load without relying on scroll pagination */
  const PAGE_SIZE = 50;

  const isInitialMount = useRef(true);
  /** >0 after fetchMore loaded older messages; snapshot must not overwrite lastDoc then */
  const paginationBatchesRef = useRef(0);
  /** One-shot older-history prefetch per chat (avoid tying to messages.length — optimistic sends retriggered the old effect) */
  const didPrefetchOlderRef = useRef(false);
  const processedReadIds = useRef(new Set<string>());
  const processedDeliveredIds = useRef(new Set<string>());

  // 1. Subscribe to messages & Typing status
  useEffect(() => {
    if (!chatId) return;

    isInitialMount.current = true;
    paginationBatchesRef.current = 0;
    didPrefetchOlderRef.current = false;
    setMessages([]);
    setLastDoc(null);
    setHasMore(true);
    setIsInitialLoading(true);
    processedReadIds.current.clear();
    processedDeliveredIds.current.clear();

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
          setLastDoc(cursor ?? null);
          // Full first page => there may be older messages; short page => we already have them all
          setHasMore(newMessages.length >= PAGE_SIZE);
          isInitialMount.current = false;
        } else if (paginationBatchesRef.current === 0 && cursor) {
          // Live window only: keep cursor in sync (e.g. first snapshot was empty, then a message arrives)
          setLastDoc(cursor);
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

    const myUid = currentUser.uid;
    let cancelled = false;
    let unsubscribePresence: (() => void) | undefined;

    const initPartner = async () => {
      const chats = await chatService.fetchChats(myUid);
      if (cancelled) return;
      let currentChat = chats.find((c) => c.id === chatId);
      if (!currentChat) {
        currentChat = (await chatService.fetchChatById(chatId)) ?? undefined;
      }
      if (cancelled) return;
      if (currentChat) {
        const partnerId = currentChat.participantIds.find(
          (uid) => uid !== myUid,
        );
        if (partnerId) {
          chatService.fetchUserById(partnerId).then((u) => {
            if (!cancelled && u) setPartnerUser(u);
          });

          unsubscribePresence = presenceService.subscribeToUserStatus(
            partnerId,
            (status) => {
              if (!cancelled) setPartnerStatus(status);
            },
          );
        }
      }
    };

    void initPartner();

    return () => {
      cancelled = true;
      unsubscribePresence?.();
    };
  }, [chatId, currentUser]);

  // 1c. Filtered Messages for Search
  const filteredMessages = useMemo(() => {
    if (!searchQuery.trim()) return messages;
    const q = searchQuery.toLowerCase();
    return messages.filter((m) =>
      (m.text ?? "").toLowerCase().includes(q),
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

      if (result.messages.length === 0 || result.messages.length < PAGE_SIZE) {
        setHasMore(false);
      }

      if (result.messages.length > 0) {
        paginationBatchesRef.current += 1;
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
      setHasMore(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [chatId, lastDoc, isLoadingMore, hasMore]);

  const handleLoadMoreRef = useRef(handleLoadMore);
  handleLoadMoreRef.current = handleLoadMore;

  // Prefetch a few older pages once per chat open if the live window is full.
  // Not keyed on messages.length — that re-fired on every optimistic send when count crossed PAGE_SIZE.
  useEffect(() => {
    if (!chatId || isInitialLoading) return;
    if (didPrefetchOlderRef.current) return;
    if (!hasMore || lastDoc == null) {
      didPrefetchOlderRef.current = true;
      return;
    }
    if (messages.length < PAGE_SIZE) {
      didPrefetchOlderRef.current = true;
      return;
    }

    didPrefetchOlderRef.current = true;
    let cancelled = false;
    const chain = async () => {
      for (let i = 0; i < 4 && !cancelled; i++) {
        await handleLoadMoreRef.current();
        await new Promise((r) => setTimeout(r, 120));
      }
    };
    void chain();
    return () => {
      cancelled = true;
    };
  }, [chatId, isInitialLoading, hasMore, lastDoc, messages.length]);

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

  // 4. Auto-Pagination on Scroll (near top = older messages)
  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } =
      event.nativeEvent;
    const hasScrollableOverflow =
      contentSize.height > layoutMeasurement.height + 32;
    if (
      contentOffset.y < 100 &&
      hasScrollableOverflow &&
      hasMore &&
      !isLoadingMore &&
      !isInitialMount.current &&
      lastDoc != null
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

          <View
            style={[
              styles.aura,
              { backgroundColor: colors.accentAI, opacity: 0.03 },
            ]}
            pointerEvents="none"
          />

          <KeyboardGestureArea style={styles.container}>
            <FlashList
              data={filteredMessages}
              keyExtractor={(item) => item.id}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
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
              contentContainerStyle={[
                styles.listContent,
                { paddingBottom: listBottomPad },
              ]}
              ListHeaderComponent={() => (
                <View style={styles.loaderContainer}>
                  {hasMore ? (
                    isLoadingMore ? (
                      <ActivityIndicator
                        size="small"
                        color={colors.accentBrand}
                      />
                    ) : null
                  ) : messages.length > 0 ? (
                    <Typography
                      variant="caption"
                      color={colors.textSecondary}
                      style={{ textAlign: "center" }}
                    >
                      Start of conversation
                    </Typography>
                  ) : null}
                </View>
              )}
            />
          </KeyboardGestureArea>

          <KeyboardStickyView
            style={[
              styles.composerDock,
              { backgroundColor: colors.bgPrimary },
            ]}
          >
            <SafeAreaView
              edges={["bottom"]}
              style={{ backgroundColor: colors.bgPrimary }}
            >
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
            </SafeAreaView>
          </KeyboardStickyView>
        </View>
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
    paddingTop: 8,
  },
  composerDock: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 2,
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
