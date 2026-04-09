import { useMemo } from 'react';
import { useColorScheme } from 'react-native';
import { usePreferencesStore } from '../store/usePreferencesStore';
import { lightTheme, darkTheme, ThemeColors } from '../theme/colors';

/**
 * useTheme Hook
 * Dynamically resolves the current color theme based on user preferences or system settings.
 */
export const useTheme = () => {
  const systemColorScheme = useColorScheme();
  const themePreference = usePreferencesStore((state) => state.theme);

  const colors: ThemeColors = useMemo(() => {
    const isDark =
      themePreference === 'dark' ||
      (themePreference === 'system' && systemColorScheme === 'dark');

    return isDark ? darkTheme : lightTheme;
  }, [themePreference, systemColorScheme]);

  const isDarkMode = themePreference === 'dark' || (themePreference === 'system' && systemColorScheme === 'dark');

  return {
    colors,
    isDarkMode,
    themePreference,
  };
};
