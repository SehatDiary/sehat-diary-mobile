import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import DailyMedicinesScreen from "../screens/patient/DailyMedicinesScreen";
import ManageCaregiversScreen from "../screens/patient/ManageCaregiversScreen";
import SettingsScreen from "../screens/common/SettingsScreen";
import { PatientStackParamList } from "../types";

const Stack = createStackNavigator<PatientStackParamList>();

export default function PatientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DailyMedicines" component={DailyMedicinesScreen} />
      <Stack.Screen
        name="ManageCaregivers"
        component={ManageCaregiversScreen}
      />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
