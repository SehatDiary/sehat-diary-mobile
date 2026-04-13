import client from "./client";
import {
  CaregiverConnection,
  PhoneLookupResult,
  CaregiverInvite,
  MyPatient,
} from "../types";

export const getMyCaregivers = async (): Promise<CaregiverConnection[]> => {
  const { data } = await client.get("/caregivers/my_list");
  return data.caregiver_connections;
};

export const lookupPhone = async (
  phone: string
): Promise<PhoneLookupResult> => {
  const { data } = await client.post("/caregivers/lookup", {
    phone_number: phone,
  });
  return data;
};

export const sendInvite = async (
  phone: string
): Promise<CaregiverConnection> => {
  const { data } = await client.post("/caregivers/invite", {
    phone_number: phone,
  });
  return data.caregiver_connection;
};

export const removeConnection = async (id: number): Promise<void> => {
  await client.delete(`/caregiver_connections/${id}`);
};

export const getPendingInvites = async (): Promise<CaregiverInvite[]> => {
  const { data } = await client.get("/caregivers/pending_invites");
  return data.invites;
};

export const acceptInvite = async (id: number): Promise<void> => {
  await client.post(`/caregiver_invites/${id}/accept`);
};

export const declineInvite = async (id: number): Promise<void> => {
  await client.post(`/caregiver_invites/${id}/decline`);
};

export const getMyPatients = async (): Promise<MyPatient[]> => {
  const { data } = await client.get("/caregivers/my_patients");
  return data.patients;
};
