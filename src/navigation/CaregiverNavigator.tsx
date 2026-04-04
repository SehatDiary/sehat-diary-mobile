import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { CaregiverStackParamList } from "../types";
import DashboardScreen from "../screens/caregiver/DashboardScreen";
import AddFamilyMemberScreen from "../screens/caregiver/AddFamilyMemberScreen";
import FamilyMemberScreen from "../screens/caregiver/FamilyMemberScreen";
import SessionDetailScreen from "../screens/caregiver/SessionDetailScreen";
import UploadPrescriptionScreen from "../screens/caregiver/UploadPrescriptionScreen";
import LabReportResultScreen from "../screens/caregiver/LabReportResultScreen";
import VisitConfirmedScreen from "../screens/caregiver/VisitConfirmedScreen";

const Stack = createStackNavigator<CaregiverStackParamList>();

export default function CaregiverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddFamilyMember" component={AddFamilyMemberScreen} />
      <Stack.Screen name="FamilyMember" component={FamilyMemberScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="UploadPrescription" component={UploadPrescriptionScreen} />
      <Stack.Screen name="LabReportResult" component={LabReportResultScreen} />
      <Stack.Screen name="VisitConfirmed" component={VisitConfirmedScreen} />
    </Stack.Navigator>
  );
}
