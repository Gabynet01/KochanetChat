import React, { useEffect, useRef, useCallback } from 'react';
import { 
  Animated, 
  StyleSheet, 
  TouchableOpacity, 
  View 
} from 'react-native';
import { MessageCircle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Typography } from './Typography';
import { useTheme } from '../hooks/useTheme';

interface NotificationBannerProps {
  title: string;
  message: string;
  onPress?: () => void;
  onClose: () => void;
}

/**
 * NotificationBanner Component
 * Custom in-app notification for simulating mock push messages.
 */
export const NotificationBanner: React.FC<NotificationBannerProps> = ({
  title,
  message,
  onPress,
  onClose,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(-150)).current;

  const hide = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: -200,
      duration: 300,
      useNativeDriver: true,
    }).start(() => onClose());
  }, [onClose, slideAnim]);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: insets.top + 10,
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
        hide();
    }, 4000);

    return () => clearTimeout(timer);
  }, [insets.top, slideAnim, hide]);

  return (
    <Animated.View 
        style={[
            styles.container, 
            { 
              transform: [{ translateY: slideAnim }],
              backgroundColor: colors.bgPrimary,
              borderColor: colors.borderColor,
            }
        ]}
    >
      <TouchableOpacity onPress={onPress || hide} style={styles.content}>
        <View style={[styles.iconBox, { backgroundColor: colors.accentBrand }]}>
            <MessageCircle size={18} color="#FFF" />
        </View>
        <View style={styles.textContainer}>
            <Typography variant="h2" style={styles.title}>{title}</Typography>
            <Typography variant="body" numberOfLines={1}>{message}</Typography>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};


const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    marginBottom: 2,
  },
});
