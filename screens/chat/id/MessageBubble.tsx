import { ImagePreview } from "@/components/ImagePreview";
import { Typography } from "@/components/Typography";
import { useTTS } from "@/hooks/useTTS";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/useAuthStore";
import { Message } from "@/types";
import * as Haptics from "expo-haptics";
import {
  RefreshCw,
  Reply,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react-native";

import React, { useEffect, useRef, useState } from "react";
import {
  Image,
  Modal,
  Pressable,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
  useWindowDimensions,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Swipeable, {
  SwipeableMethods,
} from "react-native-gesture-handler/ReanimatedSwipeable";
import Animated, {
  FadeInLeft,
  SlideInDown,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import { AudioPlayerBubble } from "./AudioPlayerBubble";
import { ReactionPill } from "./ReactionPill";

interface MessageBubbleProps {
  message: Message;
  searchQuery?: string;
  onSwipetoReply?: (message: Message) => void;
  onAddReaction?: (message: Message, emoji: string) => void;
  onEditRequest?: (message: Message) => void;
  onRetry?: (message: Message) => void;
}

/**
 * TypingIndicator Component
 */
export const TypingIndicator: React.FC = () => {
  const { colors } = useTheme();
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 600 }),
        withTiming(0.4, { duration: 600 }),
      ),
      -1,
      true,
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <View style={styles.typingContainer}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { backgroundColor: colors.accentAI },
            animatedStyle,
            { marginLeft: i === 0 ? 0 : 4 },
          ]}
        />
      ))}
    </View>
  );
};

/**
 * Enhanced MessageBubble Component
 * High-fidelity animations, AI branding, and gesture support.
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  searchQuery,
  onSwipetoReply,
  onAddReaction,
  onEditRequest,
  onRetry,
}) => {
  const { colors } = useTheme();
  const { user: currentUser } = useAuthStore();
  const [showReactions, setShowReactions] = useState(false);
  const [pillPos, setPillPos] = useState({
    top: 0,
    left: 0,
    right: 0,
    isRight: false,
  });
  const [isPreviewVisible, setIsPreviewVisible] = useState(false);
  const swipeableRef = useRef<SwipeableMethods | null>(null);
  const bubbleRef = useRef<View>(null);

  const isSentByMe = message.senderId === currentUser?.uid;
  const isAI = message.senderType === "ai";
  const replyTo = message.replyTo;

  const { speak, isPlaying } = useTTS();
  const speaking = isPlaying(message.id);

  // 1. Long Press Gesture for Reactions
  const longPressGesture = Gesture.LongPress()
    .onStart(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      bubbleRef.current?.measureInWindow((x, y_in_window, width) => {
        setPillPos({
          top: y_in_window - 50,
          left: x,
          right: screenWidth - (x + width),
          isRight: isSentByMe,
        });
        setShowReactions(true);
      });
    })
    .runOnJS(true);

  // 2. Swipe Action Render
  const renderLeftActions = () => {
    return (
      <View style={styles.swipeAction}>
        <Reply size={24} color={colors.textSecondary} />
      </View>
    );
  };

  const { width: screenWidth } = useWindowDimensions();

  const containerStyle: ViewStyle = {
    alignSelf: isSentByMe ? "flex-end" : "flex-start",
    marginVertical: 4,
  };

  const bubbleStyle: ViewStyle = {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 22,
    backgroundColor: isSentByMe ? colors.accentBrand : colors.bgSecondary,
    borderBottomRightRadius: isSentByMe ? 4 : 22,
    borderTopLeftRadius: !isSentByMe ? 4 : 22,
    maxWidth: screenWidth * 0.8,
    minWidth: replyTo ? "80%" : 0,
    borderWidth: isAI ? 1.5 : 0,
    borderColor: isAI ? colors.accentAI : "transparent",
    shadowColor: isAI ? colors.accentAI : "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: isAI ? 0.1 : 0.05,
    shadowRadius: 4,
    elevation: 2,
  };

  return (
    <Animated.View
      entering={
        Date.now() - message.createdAt < 2000
          ? isSentByMe
            ? SlideInDown.springify()
            : FadeInLeft.springify()
          : undefined
      }
      style={containerStyle}
    >
      <Swipeable
        ref={swipeableRef}
        renderLeftActions={renderLeftActions}
        onSwipeableWillOpen={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onSwipetoReply?.(message);
          // Snap back immediately
          setTimeout(() => {
            swipeableRef.current?.close();
          }, 100);
        }}
        friction={2}
      >
        <GestureDetector gesture={longPressGesture}>
          <View>
            <View ref={bubbleRef} style={bubbleStyle}>
              {/* 0. Reply Context (Glimpse style) */}
              {replyTo && (
                <View
                  style={[
                    styles.replyContainer,
                    {
                      backgroundColor: isSentByMe
                        ? "rgba(255,255,255,0.1)"
                        : "rgba(0,0,0,0.05)",
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.replyIndicator,
                      {
                        backgroundColor:
                          replyTo.senderType === "ai"
                            ? colors.accentAI
                            : colors.accentBrand,
                      },
                    ]}
                  />
                  <View style={styles.replyTextContainer}>
                    <Typography
                      variant="caption"
                      color={
                        replyTo.senderType === "ai"
                          ? colors.accentAI
                          : colors.accentBrand
                      }
                      style={{ fontWeight: "700" }}
                    >
                      {replyTo.senderType === "ai"
                        ? "Kochanet AI"
                        : replyTo.senderId === currentUser?.uid
                          ? "You"
                          : "Member"}
                    </Typography>
                    <Typography
                      variant="body"
                      numberOfLines={1}
                      style={{ fontSize: 13, opacity: 0.8 }}
                    >
                      {replyTo.text}
                    </Typography>
                  </View>
                </View>
              )}

              {isAI && (
                <View style={styles.aiHeader}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <Sparkles
                      size={14}
                      color={colors.accentAI}
                      style={styles.icon}
                    />
                    <Typography
                      variant="caption"
                      color={colors.accentAI}
                      style={{ letterSpacing: 0.5 }}
                    >
                      Kochanet AI
                    </Typography>
                  </View>

                  {/* TTS Toggle Button */}
                  {message.text !== "..." && (
                    <TouchableOpacity
                      onPress={() => speak(message.text, message.id)}
                      style={styles.ttsBtn}
                    >
                      {speaking ? (
                        <Square
                          size={14}
                          color={colors.accentAI}
                          fill={colors.accentAI}
                        />
                      ) : (
                        <Volume2 size={16} color={colors.accentAI} />
                      )}
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {message.mediaUrl && message.type === "image" && (
                <>
                  <TouchableOpacity
                    onPress={() => setIsPreviewVisible(true)}
                    activeOpacity={0.9}
                  >
                    <Image
                      source={{ uri: message.mediaUrl }}
                      style={[
                        styles.media,
                        { marginBottom: message.text ? 8 : 0 },
                      ]}
                      resizeMode="cover"
                    />
                  </TouchableOpacity>
                  <ImagePreview
                    isVisible={isPreviewVisible}
                    uri={message.mediaUrl}
                    onClose={() => setIsPreviewVisible(false)}
                  />
                </>
              )}

              {message.type === "audio" &&
                (message.audioUrl || message.localUri) && (
                  <AudioPlayerBubble
                    uri={message.audioUrl}
                    localUri={message.localUri}
                    isSentByMe={isSentByMe}
                    colorPrimary={isSentByMe ? "#FFF" : colors.accentBrand}
                    colorSecondary={
                      isSentByMe ? "rgba(255,255,255,0.2)" : colors.bgSecondary
                    }
                  />
                )}

              <View style={styles.messageFooter}>
                {message.text !== "..." && message.text && (
                  <View style={{ flexWrap: "wrap", flexDirection: "row" }}>
                    {searchQuery &&
                    message.text
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ? (
                      message.text
                        .split(new RegExp(`(${searchQuery})`, "gi"))
                        .map((part, i) => (
                          <Typography
                            key={i}
                            variant="body"
                            color={isSentByMe ? "#FFFFFF" : colors.textPrimary}
                            style={
                              part.toLowerCase() === searchQuery.toLowerCase()
                                ? {
                                    backgroundColor: "rgba(255, 255, 0, 0.4)",
                                    borderRadius: 2,
                                  }
                                : undefined
                            }
                          >
                            {part}
                          </Typography>
                        ))
                    ) : (
                      <Typography
                        variant="body"
                        color={isSentByMe ? "#FFFFFF" : colors.textPrimary}
                      >
                        {message.text}
                      </Typography>
                    )}
                  </View>
                )}
                {message.text === "..." && <TypingIndicator />}

                <View style={styles.meta}>
                  <Typography
                    variant="caption"
                    style={[
                      styles.time,
                      {
                        color: isSentByMe
                          ? "rgba(255,255,255,0.7)"
                          : colors.textSecondary,
                      },
                    ]}
                  >
                    {message.editedAt ? "(edited) " : ""}
                    {new Date(message.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Typography>

                  {isSentByMe && (
                    <View style={styles.status}>
                      {message.status === "sending" && (
                        <Sparkles size={10} color="rgba(255,255,255,0.5)" />
                      )}
                      {message.status === "sent" &&
                        !message.deliveredTo?.length && (
                          <View
                            style={[
                              styles.check,
                              { borderColor: "rgba(255,255,255,0.5)" },
                            ]}
                          />
                        )}
                      {(message.status === "delivered" ||
                        !!message.deliveredTo?.length) &&
                        !message.readBy?.length && (
                          <View style={styles.doubleCheck}>
                            <View
                              style={[
                                styles.check,
                                { borderColor: "rgba(255,255,255,0.5)" },
                              ]}
                            />
                            <View
                              style={[
                                styles.check,
                                {
                                  borderColor: "rgba(255,255,255,0.5)",
                                  marginLeft: -4,
                                },
                              ]}
                            />
                          </View>
                        )}
                      {(message.status === "read" ||
                        (message.readBy && message.readBy.length > 0)) && (
                        <View style={styles.doubleCheck}>
                          <View
                            style={[styles.check, { borderColor: "#93C5FD" }]}
                          />
                          <View
                            style={[
                              styles.check,
                              { borderColor: "#93C5FD", marginLeft: -4 },
                            ]}
                          />
                        </View>
                      )}

                      {message.status === "failed" && (
                        <TouchableOpacity
                          onPress={() => onRetry?.(message)}
                          style={[
                            styles.retryBtn,
                            {
                              backgroundColor: isSentByMe
                                ? "rgba(255,255,255,0.15)"
                                : "rgba(239, 68, 68, 0.1)",
                              borderColor: isSentByMe
                                ? "#FECACA"
                                : colors.error,
                            },
                          ]}
                        >
                          <RefreshCw
                            size={10}
                            color={isSentByMe ? "#FFF" : colors.error}
                          />
                          <Typography
                            variant="caption"
                            style={{
                              color: isSentByMe ? "#FFF" : colors.error,
                              fontSize: 10,
                              marginLeft: 4,
                              fontWeight: "800",
                            }}
                          >
                            RETRY
                          </Typography>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        </GestureDetector>
      </Swipeable>
      {/* Micro-Reaction (if any) */}
      {!!message.reactions && Object.keys(message.reactions).length > 0 && (
        <View style={styles.reactionsContainer}>
          {Object.keys(message.reactions).map((emoji) => (
            <View
              key={emoji}
              style={[
                styles.reactionTag,
                {
                  backgroundColor: colors.bgPrimary,
                  borderColor: colors.borderColor,
                },
              ]}
            >
              <Typography variant="caption" style={{ fontSize: 10 }}>
                {emoji}
              </Typography>
            </View>
          ))}
        </View>
      )}

      {/* Floating Reaction Pill */}
      <Modal
        transparent
        visible={showReactions}
        animationType="fade"
        onRequestClose={() => setShowReactions(false)}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => setShowReactions(false)}
        />
        <View
          style={[
            styles.reactionOverlay,
            pillPos.isRight ? { right: pillPos.right } : { left: pillPos.left },
            {
              top: pillPos.top,
              width: screenWidth * 0.9,
              alignItems: pillPos.isRight ? "flex-end" : "flex-start",
            },
          ]}
        >
          <ReactionPill
            onSelect={(emoji) => {
              onAddReaction?.(message, emoji);
              setShowReactions(false);
            }}
            onClose={() => setShowReactions(false)}
          />
          {isSentByMe &&
            message.type === "text" &&
            Date.now() - message.createdAt < 15 * 60 * 1000 && (
              <TouchableOpacity
                onPress={() => {
                  onEditRequest?.(message);
                  setShowReactions(false);
                }}
                style={[
                  styles.editBtn,
                  {
                    backgroundColor: colors.bgPrimary,
                    borderColor: colors.borderColor,
                  },
                ]}
              >
                <Typography variant="caption" style={{ fontWeight: "600" }}>
                  Edit Message
                </Typography>
              </TouchableOpacity>
            )}
        </View>
      </Modal>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  ttsBtn: {
    padding: 2,
    marginLeft: 8,
  },
  icon: {
    marginRight: 4,
  },
  swipeAction: {
    justifyContent: "center",
    alignItems: "center",
    width: 60,
  },
  reactionOverlay: {
    position: "absolute",
    top: -44,
    zIndex: 1000,
  },
  reactionsContainer: {
    position: "absolute",
    bottom: -8,
    right: -4,
    flexDirection: "row",
    zIndex: 10,
  },
  reactionTag: {
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginLeft: -4, // Clustered effect
  },
  editBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  typingContainer: {
    flexDirection: "row",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  media: {
    width: 240,
    height: 180,
    borderRadius: 16,
  },
  messageFooter: {
    gap: 4,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 4,
    marginTop: 2,
  },
  time: {
    fontSize: 10,
  },
  status: {
    marginLeft: 2,
  },
  doubleCheck: {
    flexDirection: "row",
    alignItems: "center",
  },
  check: {
    width: 8,
    height: 4,
    borderLeftWidth: 1.5,
    borderBottomWidth: 1.5,
    transform: [{ rotate: "-45deg" }],
    marginTop: -2,
  },
  replyContainer: {
    flexDirection: "row",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    padding: 8,
    width: "100%", // Ensure it takes full width of the bubble
  },
  replyIndicator: {
    width: 3,
    height: "100%",
    borderRadius: 2,
    marginRight: 8,
  },
  replyTextContainer: {
    flex: 1,
  },
  retryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginLeft: 8,
  },
});
