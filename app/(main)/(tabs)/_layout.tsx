import { useTheme } from "@/hooks/useTheme";
import { useChatStore } from "@/store/useChatStore";
import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import * as Haptics from "expo-haptics";
import { Tabs } from "expo-router";
import { MessageSquare, User } from "lucide-react-native";

export default function MainLayout() {
  const { colors } = useTheme();
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);

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
          height: 80,
          paddingBottom: 20,
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
