import { useTheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet, View, ViewStyle } from "react-native";
import { Typography } from "./Typography";

const Logo = ({ size = 80, style }: { size?: number; style?: ViewStyle }) => {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.logoContainer,
        { backgroundColor: colors.accentBrand },
        { width: size, height: size },
        style,
      ]}
    >
      <Typography variant="h1" color="#FFF">
        K
      </Typography>
    </View>
  );
};

export default Logo;

const styles = StyleSheet.create({
  logoContainer: {
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 8,
  },
});
