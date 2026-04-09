import { LucideIcon } from "lucide-react-native";
import React from "react";
import { StyleSheet, TouchableOpacity, ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface IconButtonProps {
  icon: LucideIcon | React.ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  size?: number;
  color?: string;
  backgroundColor?: string;
  style?: ViewStyle;
}

/**
 * IconButton Component
 */
export const IconButton: React.FC<IconButtonProps> = ({
  icon: Icon,
  onPress,
  size = 24,
  color,
  backgroundColor,
  style,
}) => {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[
        styles.base,
        {
          backgroundColor: backgroundColor || colors.bgSecondary,
          width: size * 2,
          height: size * 2,
          borderRadius: size,
        },
        style,
      ]}
    >
      <Icon size={size} color={color || colors.textPrimary} />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  base: {
    justifyContent: "center",
    alignItems: "center",
  },
});
