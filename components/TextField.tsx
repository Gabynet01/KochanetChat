import React from "react";
import {
  StyleSheet,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { useTheme } from "../hooks/useTheme";
import { Typography } from "./Typography";

interface TextFieldProps extends TextInputProps {
  label?: string;
  error?: string;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle;
}

/**
 * Standardized TextField Component
 */
export const TextField: React.FC<TextFieldProps> = ({
  label,
  error,
  containerStyle,
  inputStyle,
  placeholderTextColor,
  ...props
}) => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, containerStyle]}>
      {label && (
        <Typography variant="caption" style={styles.label}>
          {label}
        </Typography>
      )}

      <View
        style={[
          styles.inputWrapper,
          {
            backgroundColor: colors.bgSecondary,
            borderColor: error ? colors.error : "transparent",
          },
        ]}
      >
        <TextInput
          style={[
            styles.input,
            { color: colors.textPrimary, fontFamily: "Nunito_400Regular" },
            inputStyle,
          ]}
          placeholderTextColor={placeholderTextColor || colors.textSecondary}
          {...props}
        />
      </View>

      {error && (
        <Typography
          variant="caption"
          color={colors.error}
          style={styles.errorText}
        >
          {error}
        </Typography>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
    width: "100%",
  },
  label: {
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    height: 56,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    justifyContent: "center",
  },
  input: {
    fontSize: 16,
    height: "100%",
  },
  errorText: {
    marginTop: 4,
    marginLeft: 4,
  },
});
