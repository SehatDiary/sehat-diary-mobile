import axios from "axios";
import * as SecureStore from "expo-secure-store";
import { API_BASE } from "../constants";

const client = axios.create({
  baseURL: API_BASE,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await SecureStore.deleteItemAsync("auth_token");
      await SecureStore.deleteItemAsync("user");
    }
    return Promise.reject(error);
  }
);

export default client;
