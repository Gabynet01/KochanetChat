import { Image } from "expo-image";
import { StatusBar } from "expo-status-bar";
import { Download, Share2, X } from "lucide-react-native";
import React from "react";
import {
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Backdrop } from "./Backdrop";
import { Typography } from "./Typography";

interface ImagePreviewProps {
  isVisible: boolean;
  uri: string;
  onClose: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

/**
 * ImagePreview Component
 * A full-screen high-fidelity modal for viewing shared images.
 */
export const ImagePreview: React.FC<ImagePreviewProps> = ({
  isVisible,
  uri,
  onClose,
}) => {
  const insets = useSafeAreaInsets();

  if (!uri) return null;

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar style="light" />
        <Backdrop onPress={onClose} />

        {/* Header Actions */}
        <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            hitSlop={20}
          >
            <X color="#FFF" size={28} />
          </TouchableOpacity>

          <View style={styles.rightActions}>
            <TouchableOpacity style={styles.actionBtn}>
              <Download color="#FFF" size={22} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Share2 color="#FFF" size={22} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Main Image View */}
        <TouchableOpacity
          activeOpacity={1}
          onPress={onClose}
          style={styles.imageContainer}
        >
          <Image
            source={{ uri }}
            style={styles.fullImage}
            contentFit="contain"
            transition={300}
          />
        </TouchableOpacity>

        {/* Footer Info (Optional) */}
        <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
          <Typography color="#FFF" variant="caption" style={{ opacity: 0.7 }}>
            Kochanet Shared Media
          </Typography>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    zIndex: 10,
  },
  closeBtn: {
    padding: 4,
  },
  rightActions: {
    flexDirection: "row",
    gap: 20,
  },
  actionBtn: {
    padding: 4,
  },
  imageContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.7,
  },
  footer: {
    alignItems: "center",
  },
});
