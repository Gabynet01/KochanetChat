import { Typography } from "@/components/Typography";
import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

const EMOJIS = ["❤️", "😂", "😮", "😢", "🙏", "👍"];

interface ReactionPillProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

/**
 * ReactionPill Component
 * Floating emoji picker for message reactions.
 */
export const ReactionPill: React.FC<ReactionPillProps> = ({ onSelect }) => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: colors.bgPrimary, borderColor: colors.borderColor },
      ]}
    >
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        {EMOJIS.map((emoji) => (
          <TouchableOpacity
            key={emoji}
            onPress={() => onSelect(emoji)}
            style={styles.emojiBtn}
          >
            <Typography variant="h2">{emoji}</Typography>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    height: 48,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emojiBtn: {
    paddingHorizontal: 8,
  },
});
