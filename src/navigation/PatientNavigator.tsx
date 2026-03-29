import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import DailyMedicinesScreen from "../screens/patient/DailyMedicinesScreen";

const Stack = createStackNavigator();

export default function PatientNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="DailyMedicines" component={DailyMedicinesScreen} />
    </Stack.Navigator>
  );
}
