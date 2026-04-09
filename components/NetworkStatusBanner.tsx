import { useTheme } from "@/hooks/useTheme";
import { useNetworkStore } from "@/services/network";
import { WifiOff } from "lucide-react-native";
import React from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Typography } from "./Typography";

/**
 * NetworkStatusBanner
 * A premium connectivity indicator that slides down from the top.
 */
export const NetworkStatusBanner = () => {
  const isOnline = useNetworkStore((state) => state.isOnline);
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const translateY = useSharedValue(-100);

  const animatedStyle = useAnimatedStyle(() => {
    if (!isOnline) {
      // Slide down
      translateY.value = withSpring(insets.top > 0 ? insets.top : 10, {
        damping: 15,
        stiffness: 100,
      });
    } else {
      // Slide up
      translateY.value = withTiming(-100, { duration: 300 });
    }
    return {
      transform: [{ translateY: translateY.value }],
    };
  }, [isOnline, insets.top, translateY]);

  return (
    <Animated.View
      style={[
        styles.container,
        animatedStyle,
        { backgroundColor: colors.bgSecondary },
      ]}
    >
      <View style={[styles.content, { borderColor: colors.error + "40" }]}>
        <WifiOff size={18} color={colors.error} />
        <Typography variant="caption" color={colors.error} style={styles.text}>
          No Internet Connection
        </Typography>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 0,
    left: 20,
    right: 20,
    zIndex: 9999,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderRadius: 12,
  },
  text: {
    marginLeft: 8,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
});
