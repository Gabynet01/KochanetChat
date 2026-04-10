import { useTheme } from "@/hooks/useTheme";
import { chatService } from "@/services/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "@/types";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { Plus } from "lucide-react-native";
import React, { useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { NewChatModal } from "./NewChatModal";

const NewChat = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);

  const { user } = useAuthStore();
  const { colors } = useTheme();

  const router = useRouter();

  const handleSelectUser = async (targetUser: User) => {
    if (!user) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setIsModalVisible(false);
    const newChat = await chatService.getOrCreateDirectChat(
      user.uid,
      targetUser.uid,
      targetUser.displayName,
    );
    if (newChat) {
      router.push({
        pathname: `/(main)/chat/[id]`,
        params: {
          id: newChat.id,
          name: targetUser.displayName,
          avatarUrl: targetUser.avatarUrl,
        },
      });
    }
  };
  return (
    <>
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accentBrand }]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          setIsModalVisible(true);
        }}
      >
        <Plus color="#FFF" size={28} />
      </TouchableOpacity>

      <NewChatModal
        isVisible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        onSelectUser={handleSelectUser}
      />
    </>
  );
};

const styles = StyleSheet.create({
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

export default NewChat;
