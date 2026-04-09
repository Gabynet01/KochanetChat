import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, TouchableOpacity } from "react-native";

interface BackdropProps {
  onPress?: () => void;
}

export const Backdrop: React.FC<BackdropProps> = ({ onPress }) => {
  const { isDarkMode } = useTheme();

  const backdropColor = isDarkMode
    ? "rgba(255, 255, 255, 0.2)"
    : "rgba(0, 0, 0, 0.5)";

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={onPress}
      style={[styles.backdrop, { backgroundColor: backdropColor }]}
    />
  );
};

const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
});
