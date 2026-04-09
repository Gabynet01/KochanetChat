import React from "react";
import {
  ActivityIndicator,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Typography } from "./Typography";

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "outline" | "ghost";
  isLoading?: boolean;
  disabled?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

/**
 * Custom Button Component
 */
export const Button: React.FC<ButtonProps> = ({
  title,
  onPress,
  variant = "primary",
  isLoading = false,
  disabled = false,
  style,
  textStyle,
  icon,
}) => {
  const { colors } = useTheme();

  const getStyles = () => {
    const base: ViewStyle = {
      flexDirection: "row",
      backgroundColor: colors.accentBrand,
      height: 56,
      borderRadius: 16,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 16,
    };

    switch (variant) {
      case "secondary":
        return { ...base, backgroundColor: colors.bgSecondary };
      case "outline":
        return {
          ...base,
          backgroundColor: "transparent",
          borderWidth: 2,
          borderColor: colors.borderColor,
        };
      case "ghost":
        return { ...base, backgroundColor: "transparent" };
      default:
        return base;
    }
  };

  const getTextColor = () => {
    if (variant === "primary") return "#FFFFFF";
    if (variant === "secondary") return colors.textPrimary;
    return colors.accentBrand;
  };

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      disabled={disabled || isLoading}
      style={[getStyles(), style, (disabled || isLoading) && { opacity: 0.5 }]}
    >
      {isLoading ? (
        <ActivityIndicator color={getTextColor()} />
      ) : (
        <>
          {icon && <View style={{ marginRight: 8 }}>{icon}</View>}
          <Typography variant="button" color={getTextColor()} style={textStyle}>
            {title}
          </Typography>
        </>
      )}
    </TouchableOpacity>
  );
};
