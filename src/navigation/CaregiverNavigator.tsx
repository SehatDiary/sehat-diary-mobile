import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import DashboardScreen from "../screens/caregiver/DashboardScreen";

const Stack = createStackNavigator();

export default function CaregiverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
    </Stack.Navigator>
  );
}
