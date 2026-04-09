import React, { useMemo } from "react";
import { Text, TextStyle, StyleProp } from "react-native";
import { useTheme } from "../hooks/useTheme";

interface TypographyProps {
  children: React.ReactNode;
  variant?: "h1" | "h2" | "body" | "caption" | "button";
  color?: string;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

/**
 * Typography Component
 * Standardized text variants using Quicksand for headings and Nunito for body.
 */
export const Typography: React.FC<TypographyProps> = ({
  children,
  variant = "body",
  color,
  style,
  numberOfLines,
}) => {
  const { colors } = useTheme();

  const textStyle = useMemo(() => {
    let base: TextStyle = {
      color: color || colors.textPrimary,
    };

    switch (variant) {
      case "h1":
        base = { ...base, fontFamily: "Quicksand_700Bold", fontSize: 28 };
        break;
      case "h2":
        base = { ...base, fontFamily: "Quicksand_700Bold", fontSize: 20 };
        break;
      case "body":
        base = { ...base, fontFamily: "Nunito_400Regular", fontSize: 16 };
        break;
      case "caption":
        base = {
          ...base,
          fontFamily: "Nunito_600SemiBold",
          fontSize: 13,
          color: colors.textSecondary,
        };
        break;
      case "button":
        base = { ...base, fontFamily: "Quicksand_700Bold", fontSize: 16 };
        break;
    }

    return [base, style];
  }, [variant, color, colors, style]);

  return (
    <Text style={textStyle} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
};
