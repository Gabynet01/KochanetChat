import { Search } from "lucide-react-native";
import React from "react";
import { StyleSheet, TextInput, View, ViewStyle } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface SearchFieldProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  style?: ViewStyle;
}

/**
 * Custom SearchField Component
 */
export const SearchField: React.FC<SearchFieldProps> = ({
  value,
  onChangeText,
  placeholder = "Search chats...",
  style,
}) => {
  const { colors } = useTheme();

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgSecondary }, style]}
    >
      <Search size={18} color={colors.textSecondary} style={styles.icon} />
      <TextInput
        style={[
          styles.input,
          { color: colors.textPrimary, fontFamily: "Nunito_400Regular" },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textSecondary}
        autoCapitalize="none"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
  },
  icon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 15,
    height: "100%",
  },
});
