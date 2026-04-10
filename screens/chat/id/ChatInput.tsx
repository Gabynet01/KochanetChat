import { Typography } from "@/components/Typography";
import useDebounce from "@/hooks/useDebounce";
import { useTheme } from "@/hooks/useTheme";
import { chatService } from "@/services/chat";
import { transcriptionService } from "@/services/transcription";
import { useAuthStore } from "@/store/useAuthStore";
import { useErrorStore } from "@/store/useErrorStore";
import {
  AudioModule,
  RecordingPresets,
  useAudioRecorder,
  useAudioRecorderState,
} from "expo-audio";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import { Check, Mic, Plus, Send, Sparkles, X } from "lucide-react-native";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { AudioWaveform } from "./AudioWaveform";

interface ChatInputProps {
  chatId: string;
  onSend: (
    text: string,
    mediaUrl?: string,
    audioUrl?: string,
    localUri?: string,
  ) => Promise<string | void>;
  isLoading?: boolean;
  editingMessage?: { id: string; text: string } | null;
  onCancelEdit?: () => void;
  onSaveEdit?: (id: string, text: string) => void;
  updateMessageStatus?: (
    tempId: string,
    status: "sending" | "sent" | "failed",
  ) => void;
}

/**
 * Enhanced ChatInput Component
 * Supports Auto-growing text and long-press Voice Recording simulation.
 */
export const ChatInput: React.FC<ChatInputProps> = ({
  chatId,
  onSend,
  isLoading,
  editingMessage,
  onCancelEdit,
  onSaveEdit,
  updateMessageStatus,
}) => {
  const [text, setText] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);

  const debouncedText = useDebounce(text, 1500);
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const recorderState = useAudioRecorderState(recorder, 100);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const aiIndicatorAnim = useRef(new Animated.Value(0)).current;

  const { colors } = useTheme();
  const { user } = useAuthStore();

  const isAiMode = text.includes("@ai");
  const isTyping = text.trim().length > 0 && text !== debouncedText;

  const startPulse = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  };

  const stopPulse = () => {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  };

  const handleSend = () => {
    if (!text.trim() || isLoading) return;

    // Clear typing indicator immediately on send
    if (chatId && user) {
      chatService.setTypingStatus(chatId, user.uid, false);
    }

    if (editingMessage) {
      onSaveEdit?.(editingMessage.id, text.trim());
    } else {
      onSend(text.trim());
      setText("");
    }
  };

  const handleMediaPicker = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      useErrorStore
        .getState()
        .setError("Please grant permission to access your photos.", "warning");
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });

    if (!result.canceled && result.assets && result.assets.length > 0 && user) {
      setIsTranscribing(true); // Re-using state for generic loading
      try {
        const localUri = result.assets[0].uri;
        const storageUrl = await chatService.uploadMedia(localUri, user.uid);
        onSend("", storageUrl, undefined);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (error) {
        console.error("Image upload failed", error);
        // Error store handled by chatService
      } finally {
        setIsTranscribing(false);
      }
    }
  };

  const handleStartRecording = async () => {
    const { status } = await AudioModule.requestRecordingPermissionsAsync();
    if (status !== "granted") {
      useErrorStore
        .getState()
        .setError(
          "Microphone access is required to record voice messages.",
          "warning",
        );
      return;
    }

    try {
      // 1. Prepare (await it!)
      // Some versions of expo-audio throw if already prepared
      try {
        await recorder.prepareToRecordAsync();
      } catch (prepError: any) {
        if (!prepError.message?.includes("already been prepared")) {
          throw prepError;
        }
        console.log("[Audio] Recorder already prepared, continuing...");
      }

      // 2. Start UI and haptics
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setIsRecording(true);
      startPulse();

      // 3. Record
      recorder.record();
    } catch (e) {
      console.error("Failed to start recording", e);
      setIsRecording(false);
      stopPulse();
      useErrorStore
        .getState()
        .setError("Failed to start recording. Please try again.");
    }
  };

  const handleStopRecording = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsRecording(false);
    stopPulse();

    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (uri && user) {
        // 1. Send optimistic message IMMEDIATELY
        const tempId = await onSend("", undefined, undefined, uri);

        if (!tempId) return;

        setIsTranscribing(true);
        let audioUrl = "";
        let transcribedText = "";

        try {
          // 2. Upload audio to storage first (CORE requirement)
          audioUrl = await transcriptionService.uploadAudio(uri, user.uid);

          // 3. Attempt transcription (OPTIONAL for human-to-human)
          try {
            transcribedText = await transcriptionService.transcribe(
              uri,
              user.uid,
            );
          } catch (transError) {
            console.warn("[Transcription] Failed to transcribe:", transError);
            // If AI Mode is active, we MUST have transcription
            if (isAiMode) {
              throw transError;
            }
            // Otherwise, we continue without text
          }

          // 4. Send/Update the message on the server
          await chatService.sendMessage(
            chatId,
            transcribedText,
            user.uid,
            "human",
            undefined,
            audioUrl,
          );

          updateMessageStatus?.(tempId, "sent");
        } catch (err) {
          console.error("[Audio] Process failed", err);
          updateMessageStatus?.(tempId, "failed");
        } finally {
          setIsTranscribing(false);
        }
      }
    } catch (e) {
      console.error("Failed to stop recording", e);
    }
  };

  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.text);
    } else {
      setText("");
    }
  }, [editingMessage]);

  useEffect(() => {
    Animated.spring(aiIndicatorAnim, {
      toValue: isAiMode ? 1 : 0,
      useNativeDriver: true,
      tension: 40,
      friction: 7,
    }).start();
  }, [isAiMode, aiIndicatorAnim]);

  useEffect(() => {
    if (!chatId || !user) return;
    chatService.setTypingStatus(chatId, user.uid, isTyping);
  }, [isTyping, chatId, user]);

  // Clear typing on unmount
  useEffect(() => {
    return () => {
      if (chatId && user) {
        chatService.setTypingStatus(chatId, user.uid, false);
      }
    };
  }, [chatId, user]);

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.bgPrimary,
          borderTopColor: colors.borderColor,
        },
      ]}
    >
      {/* AI Mode Indicator */}
      <Animated.View
        style={[
          styles.aiIndicator,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: colors.accentAI,
            opacity: aiIndicatorAnim,
            transform: [
              {
                translateY: aiIndicatorAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        <Sparkles size={14} color={colors.accentAI} />
        <Typography
          variant="caption"
          color={colors.accentAI}
          style={{ marginLeft: 6, fontWeight: "600", letterSpacing: 0.3 }}
        >
          AI MODE ACTIVE
        </Typography>
      </Animated.View>

      {isRecording ? (
        <View
          style={[
            styles.recordingWrapper,
            { backgroundColor: colors.bgSecondary },
          ]}
        >
          <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
            <View
              style={[styles.pulseIcon, { backgroundColor: colors.error }]}
            />
          </Animated.View>

          <AudioWaveform
            isRecording={true}
            metering={recorderState?.metering}
            style={styles.waveform}
            height={32}
            color={colors.accentBrand}
          />

          <Typography variant="caption" style={styles.recordingTime}>
            {Math.floor((recorderState?.durationMillis || 0) / 1000)}s
          </Typography>

          <TouchableOpacity
            onPress={() => setIsRecording(false)}
            style={styles.cancelBtn}
          >
            <X size={20} color={colors.textSecondary} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStopRecording}
            style={[styles.sendBtn, { backgroundColor: colors.accentBrand }]}
            disabled={isTranscribing}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Mic size={20} color="#FFF" />
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View
          style={[styles.inputWrapper, { backgroundColor: colors.bgSecondary }]}
        >
          <TouchableOpacity style={styles.plusBtn} onPress={handleMediaPicker}>
            <Plus size={24} color={colors.textSecondary} />
          </TouchableOpacity>

          <TextInput
            style={[
              styles.input,
              { color: colors.textPrimary, fontFamily: "Nunito_400Regular" },
            ]}
            placeholder="Message..."
            placeholderTextColor={colors.textSecondary}
            multiline
            value={text}
            onChangeText={setText}
            maxLength={1000}
          />

          {!text.trim() ? (
            <TouchableOpacity
              onPress={handleStartRecording}
              style={styles.micBtn}
            >
              <Mic size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={handleSend}
              disabled={
                !!isLoading ||
                !!(editingMessage && text.trim() === editingMessage.text)
              }
              style={[styles.sendBtn, { backgroundColor: colors.accentBrand }]}
            >
              {editingMessage ? (
                <Check size={20} color="#FFF" />
              ) : (
                <Send size={20} color="#FFF" />
              )}
            </TouchableOpacity>
          )}
          {editingMessage && (
            <TouchableOpacity
              onPress={onCancelEdit}
              style={styles.cancelEditBtn}
            >
              <X size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    position: "relative",
  },
  aiIndicator: {
    position: "absolute",
    top: -30,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 10,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 8,
    paddingVertical: 6,
    minHeight: 48,
  },
  recordingWrapper: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 6,
    height: 48,
  },
  pulseIcon: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  waveform: {
    flex: 1,
    marginHorizontal: 12,
  },
  recordingTime: {
    marginRight: 12,
    minWidth: 24,
  },
  cancelBtn: {
    marginRight: 16,
  },
  plusBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  micBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingTop: 8,
    paddingBottom: 8,
    maxHeight: 120,
    marginHorizontal: 8,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  cancelEditBtn: {
    marginLeft: 4,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
});
