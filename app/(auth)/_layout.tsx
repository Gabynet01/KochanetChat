import React from 'react';
import { Stack } from 'expo-router';

/**
 * (auth) Layout
 * Basic stack for login and registration screens.
 */
export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
      <Stack.Screen name="login" />
    </Stack>
  );
}
