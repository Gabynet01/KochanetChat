import { useTheme } from "@/hooks/useTheme";
import { useErrorStore } from "@/store/useErrorStore";
import { AlertCircle, CheckCircle, Info, X } from "lucide-react-native";
import React, { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  FadeInUp,
  FadeOutUp,
  LinearTransition,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "./Typography";

/**
 * GlobalErrorHandler Component
 * A premium, animated Toast notification system.
 * Listens to useErrorStore to show global messages.
 */
export const GlobalErrorHandler = () => {
  const { message, type, clearError } = useErrorStore();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => {
        clearError();
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [message, clearError]);

  if (!message) return null;

  const getIcon = () => {
    switch (type) {
      case "success" as any:
        return <CheckCircle size={20} color={colors.success} />;
      case "warning":
        return <AlertCircle size={20} color={colors.warning} />;
      case "info":
        return <Info size={20} color={colors.accentBrand} />;
      default:
        return <AlertCircle size={20} color={colors.error} />;
    }
  };

  const getBorderColor = () => {
    switch (type) {
      case "success":
        return colors.success;
      case "warning":
        return colors.warning;
      case "info":
        return colors.accentBrand;
      default:
        return colors.error;
    }
  };

  return (
    <Animated.View
      entering={FadeInUp.springify()}
      exiting={FadeOutUp}
      layout={LinearTransition.springify()}
      style={[
        styles.container,
        {
          top: insets.top + 10,
          backgroundColor: colors.bgSecondary,
          borderLeftColor: getBorderColor(),
          shadowColor: colors.textPrimary,
        },
      ]}
    >
      <View style={styles.content}>
        <View style={styles.iconContainer}>{getIcon()}</View>
        <View style={styles.textContainer}>
          <Typography
            variant="body"
            style={{ fontWeight: "600", fontSize: 13 }}
          >
            {type.toUpperCase()}
          </Typography>
          <Typography
            variant="caption"
            color={colors.textSecondary}
            numberOfLines={2}
          >
            {message}
          </Typography>
        </View>
        <Pressable onPress={clearError} style={styles.closeBtn}>
          <X size={16} color={colors.textSecondary} />
        </Pressable>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderLeftWidth: 4,
    padding: 12,
    elevation: 8,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    gap: 2,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 8,
  },
});
