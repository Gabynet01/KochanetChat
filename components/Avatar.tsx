import React from 'react';
import { View, Image, StyleSheet, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { Typography } from './Typography';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: number;
  isOnline?: boolean;
  style?: ViewStyle;
}

/**
 * Avatar Component
 * Displays a rounded user image with an optional online status indicator.
 */
export const Avatar: React.FC<AvatarProps> = ({ uri, name, size = 40, isOnline, style }) => {
  const { colors } = useTheme();

  const getInitials = (n?: string) => {
    if (!n) return '?';
    return n.split(' ').map(x => x[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <View style={[styles.container, { width: size, height: size }, style]}>
      {uri ? (
        <Image 
          source={{ uri }} 
          style={[styles.image, { borderRadius: size / 2 }]} 
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: colors.bgSecondary, borderRadius: size / 2 }]}>
           <Typography variant="body" style={{ fontSize: size * 0.4 }}>{getInitials(name)}</Typography>
        </View>
      )}
      
      {isOnline && (
        <View 
          style={[
            styles.presence, 
            { 
              backgroundColor: colors.success,
              width: size * 0.25,
              height: size * 0.25,
              borderRadius: size * 0.125,
              borderColor: colors.bgPrimary,
            }
          ]}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  presence: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    borderWidth: 2,
  },
});
