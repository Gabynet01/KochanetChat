import { palette } from "@/theme/colors";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

import { useErrorStore } from "@/store/useErrorStore";
import { useEffect } from "react";

// Configure how notifications behave when the app is in the foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});



export async function registerForPushNotificationsAsync() {
  let token;

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: palette.blue[500], // Kochanet Brand Primary
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.warn("Failed to get push token for push notification!");
      return null;
    }

    // Gets the Expo Push Token
    const projectId = Constants.easConfig?.projectId ?? "411729e4-2c08-4554-85b9-830785989d44";

    token = await Notifications.getExpoPushTokenAsync({
      projectId,
    });
    
    console.log("Expo Push Token successfully retrieved:", token.data);
  } else {
    console.log("Push notifications skipped: Not a physical device");
  }

  return token?.data;
}

/**
 * Hook to handle in-app notification listening.
 * Triggers the local toast when a push arrives while foregrounded.
 */
export function usePushNotifications() {
  useEffect(() => {
    // Listener for when a notification is received while the app is foregrounded
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
      const { title, body } = notification.request.content;
      
      // Use the global error/info toast to show the notification in-app
      const message = title ? `${title}: ${body}` : body;
      if (message) {
        useErrorStore.getState().setError(message, "info");
      }
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.remove();
    };
  }, []);
}