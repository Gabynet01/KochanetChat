import { StatusBar } from "expo-status-bar";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import {
  KeyboardAwareScrollView,
  KeyboardControllerView,
} from "react-native-keyboard-controller";
import { EdgeInsets, useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "../hooks/useTheme";

interface ScreenProps {
  children: React.ReactNode;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  safeArea?: boolean;
  scrollable?: boolean;
}

/**
 * Master Screen Component
 * Handles Safe Area Insets, Keyboard Avoidance, and Theme Background.
 */
export const Screen: React.FC<ScreenProps> = ({
  children,
  style,
  contentContainerStyle,
  safeArea = true,
  scrollable = false,
}) => {
  const { colors, isDarkMode } = useTheme();
  const insets: EdgeInsets = useSafeAreaInsets();

  const containerStyle: ViewStyle = {
    backgroundColor: colors.bgPrimary,
    paddingTop: safeArea ? insets.top : 0,
    paddingBottom: safeArea ? insets.bottom : 0,
  };

  const renderContent = () => {
    if (scrollable) {
      return (
        <KeyboardAwareScrollView
          style={styles.container}
          contentContainerStyle={contentContainerStyle}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </KeyboardAwareScrollView>
      );
    }
    return (
      <View style={[styles.container, contentContainerStyle]}>{children}</View>
    );
  };

  return (
    <KeyboardControllerView style={[styles.container, containerStyle, style]}>
      <StatusBar
        style={isDarkMode ? "light" : "dark"}
        translucent
      />
      {renderContent()}
    </KeyboardControllerView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
