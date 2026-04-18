import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { CaregiverStackParamList } from "../types";
import DashboardScreen from "../screens/caregiver/DashboardScreen";
import AddFamilyMemberScreen from "../screens/caregiver/AddFamilyMemberScreen";
import FamilyMemberScreen from "../screens/caregiver/FamilyMemberScreen";
import SessionDetailScreen from "../screens/caregiver/SessionDetailScreen";
import UploadPrescriptionScreen from "../screens/caregiver/UploadPrescriptionScreen";
import UploadLabReportScreen from "../screens/caregiver/UploadLabReportScreen";
import LabReportResultScreen from "../screens/caregiver/LabReportResultScreen";
import VisitConfirmedScreen from "../screens/caregiver/VisitConfirmedScreen";
import MemberAdherenceScreen from "../screens/caregiver/MemberAdherenceScreen";
import PendingInvitesScreen from "../screens/caregiver/PendingInvitesScreen";
import SettingsScreen from "../screens/common/SettingsScreen";

const Stack = createStackNavigator<CaregiverStackParamList>();

export default function CaregiverNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="AddFamilyMember" component={AddFamilyMemberScreen} />
      <Stack.Screen name="FamilyMember" component={FamilyMemberScreen} />
      <Stack.Screen name="SessionDetail" component={SessionDetailScreen} />
      <Stack.Screen name="UploadPrescription" component={UploadPrescriptionScreen} />
      <Stack.Screen name="UploadLabReport" component={UploadLabReportScreen} />
      <Stack.Screen name="LabReportResult" component={LabReportResultScreen} />
      <Stack.Screen name="VisitConfirmed" component={VisitConfirmedScreen} />
      <Stack.Screen name="MemberAdherence" component={MemberAdherenceScreen} />
      <Stack.Screen name="PendingInvites" component={PendingInvitesScreen} />
      <Stack.Screen name="Settings" component={SettingsScreen} />
    </Stack.Navigator>
  );
}
