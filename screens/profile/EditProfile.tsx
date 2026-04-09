import { Backdrop } from "@/components/Backdrop";
import { Button } from "@/components/Button";
import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth";
import { useAuthStore } from "@/store/useAuthStore";
import { Edit3 } from "lucide-react-native";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const EditProfile = () => {
  const { user, updateProfile } = useAuthStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || "");
  const [editBio, setEditBio] = useState(user?.bio || "");

  const handleSaveProfile = async () => {
    if (!user) return;
    const profile = { displayName: editName, bio: editBio };
    updateProfile(profile);
    setIsEditModalVisible(false);

    // Persist to Firestore
    await authService.syncUserProfile({ ...user, ...profile });
  };
  return (
    <>
      <TouchableOpacity
        style={[styles.editBtn, { backgroundColor: colors.bgSecondary }]}
        onPress={() => {
          setEditName(user?.displayName || "");
          setEditBio(user?.bio || "");
          setIsEditModalVisible(true);
        }}
      >
        <Edit3 size={16} color={colors.textPrimary} />
        <Typography variant="caption" style={{ marginLeft: 8 }}>
          Edit Profile
        </Typography>
      </TouchableOpacity>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={styles.modalOverlay}
          keyboardVerticalOffset={-50}
        >
          <Backdrop onPress={() => setIsEditModalVisible(false)} />
          <View
            style={[
              styles.modalContent,
              {
                backgroundColor: colors.bgPrimary,
                paddingBottom: Math.max(insets.bottom, 24) + 20,
              },
            ]}
          >
            <Typography variant="h2" style={{ marginBottom: 20 }}>
              Edit Profile
            </Typography>

            <Typography variant="caption" style={{ marginBottom: 8 }}>
              Display Name
            </Typography>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.bgSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.borderColor,
                },
              ]}
              value={editName}
              onChangeText={setEditName}
              placeholder="Enter name"
              autoFocus={false}
            />

            <Typography
              variant="caption"
              style={{ marginBottom: 8, marginTop: 16 }}
            >
              Bio
            </Typography>
            <TextInput
              style={[
                styles.input,
                styles.textArea,
                {
                  backgroundColor: colors.bgSecondary,
                  color: colors.textPrimary,
                  borderColor: colors.borderColor,
                },
              ]}
              value={editBio}
              onChangeText={setEditBio}
              placeholder="Tell us about yourself"
              multiline
              numberOfLines={3}
            />

            <View style={styles.modalFooter}>
              <Button
                title="Cancel"
                variant="outline"
                onPress={() => setIsEditModalVisible(false)}
                style={{ flex: 1, marginRight: 8 }}
              />
              <Button
                title="Save"
                onPress={handleSaveProfile}
                style={{ flex: 1, marginLeft: 8 }}
              />
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
};

export default EditProfile;

const styles = StyleSheet.create({
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
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
