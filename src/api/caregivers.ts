import client from "./client";
import { CaregiverConnection, PhoneLookupResult } from "../types";

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
