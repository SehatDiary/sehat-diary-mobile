import React, { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { createStackNavigator } from "@react-navigation/stack";
import { useAuthStore } from "../store/authStore";
import { useNotifications } from "../hooks/useNotifications";
import RequestOtpScreen from "../screens/auth/RequestOtpScreen";
import VerifyOtpScreen from "../screens/auth/VerifyOtpScreen";
import CaregiverNavigator from "./CaregiverNavigator";
import PatientNavigator from "./PatientNavigator";
import { COLORS } from "../constants";

const Stack = createStackNavigator();

function NotificationInitializer() {
  useNotifications();
  return null;
}

export default function RootNavigator() {
  const { user, token, isLoading, loadFromStorage } = useAuthStore();

  useEffect(() => {
    loadFromStorage();
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: COLORS.white }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  const isAuthenticated = !!(token && user);

  return (
    <>
      {isAuthenticated && <NotificationInitializer />}
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isAuthenticated ? (
          user!.role === "patient" ? (
            <Stack.Screen name="Patient" component={PatientNavigator} />
          ) : (
            <Stack.Screen name="Caregiver" component={CaregiverNavigator} />
          )
        ) : (
          <>
            <Stack.Screen name="RequestOtp" component={RequestOtpScreen} />
            <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
          </>
        )}
      </Stack.Navigator>
    </>
  );
}
