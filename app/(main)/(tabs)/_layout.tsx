import { useTheme } from "@/hooks/useTheme";
import { useChatStore } from "@/store/useChatStore";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { MessageSquare, User } from "lucide-react-native";
import { Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const MIN_TAB_BAR_BOTTOM =
  Platform.OS === "android" ? 24 : 12;

export default function MainLayout() {
  const { colors } = useTheme();
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);
  const insets = useSafeAreaInsets();
  /** Clear home indicator / Android nav bar (insets.bottom is sometimes 0 on older layouts). */
  const tabBarBottomPad = Math.max(insets.bottom, MIN_TAB_BAR_BOTTOM);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarActiveTintColor: colors.accentBrand,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.bgPrimary,
          borderTopWidth: 0,
          elevation: 0,
          paddingTop: 8,
          paddingBottom: tabBarBottomPad,
          height: 56 + tabBarBottomPad,
        },
        tabBarLabelStyle: {
          fontFamily: "Quicksand_700Bold",
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Chats",
          tabBarIcon: ({ color }) => <MessageSquare size={24} color={color} />,
          tabBarBadge: totalUnreadCount > 0 ? totalUnreadCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: colors.accentBrand,
            color: "#fff",
            fontSize: 10,
            fontFamily: "Nunito_700Bold",
          },
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <User size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        props.onPressIn?.(ev);
      }}
    />
  );
}
