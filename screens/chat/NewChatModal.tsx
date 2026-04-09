import { Avatar } from "@/components/Avatar";
import { Backdrop } from "@/components/Backdrop";
import { SearchField } from "@/components/SearchField";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { chatService } from "@/services/chat";
import { useAuthStore } from "@/store/useAuthStore";
import { User } from "@/types";
import { UserPlus, X } from "lucide-react-native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface NewChatModalProps {
  isVisible: boolean;
  onClose: () => void;
  onSelectUser: (user: User) => void;
}

export const NewChatModal: React.FC<NewChatModalProps> = ({
  isVisible,
  onClose,
  onSelectUser,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { user: currentUser } = useAuthStore();

  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isVisible) {
      loadUsers();
    }
  }, [isVisible]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const data = await chatService.fetchUsers();
      setUsers(data);
    } catch (e) {
      console.error("Failed to load users", e);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredUsers = users.filter((u) => {
    // Exclude current user
    if (u.uid === currentUser?.uid) return false;

    const query = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(query) ||
      u.email.toLowerCase().includes(query)
    );
  });

  return (
    <Modal
      visible={isVisible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Backdrop onPress={onClose} />
        <View
          style={[
            styles.content,
            {
              backgroundColor: colors.bgPrimary,
              paddingBottom: Math.max(insets.bottom, 24) + 20,
            },
          ]}
        >
          <View style={styles.header}>
            <Typography variant="h2">New Chat</Typography>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={24} color={colors.textPrimary} />
            </TouchableOpacity>
          </View>

          <SearchField
            value={search}
            onChangeText={setSearch}
            placeholder="Search people..."
            style={styles.search}
          />

          {isLoading ? (
            <View style={styles.center}>
              <ActivityIndicator color={colors.accentBrand} />
            </View>
          ) : (
            <FlatList
              data={filteredUsers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.userItem}
                  onPress={() => onSelectUser(item)}
                >
                  <Avatar
                    uri={item.avatarUrl}
                    size={48}
                    isOnline={item.isOnline}
                  />
                  <View style={styles.userInfo}>
                    <Typography variant="body" style={styles.userName}>
                      {item.displayName}
                    </Typography>
                    <Typography variant="caption" color={colors.textSecondary}>
                      {item.email}
                    </Typography>
                  </View>
                  <UserPlus size={20} color={colors.accentBrand} />
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <View style={styles.center}>
                  <Typography variant="body" color={colors.textSecondary}>
                    No users found.
                  </Typography>
                </View>
              }
              contentContainerStyle={styles.listContent}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  content: {
    height: "80%",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingTop: 24,
    paddingHorizontal: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  closeBtn: {
    padding: 4,
  },
  search: {
    marginBottom: 20,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  userItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  userInfo: {
    flex: 1,
    marginLeft: 16,
  },
  userName: {
    fontWeight: "600",
  },
  listContent: {
    paddingBottom: 40,
  },
});
