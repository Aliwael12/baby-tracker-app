import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Update this to your API server address.
// For Expo Go on a physical device, use your machine's LAN IP (e.g. http://192.168.1.x:3001).
// For Android emulator use http://10.0.2.2:3001
// For iOS simulator use http://localhost:3001
export const API_BASE_URL = "http://192.168.1.99:3001";

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 10000,
});

// Inject token on every request
apiClient.interceptors.request.use(async (config) => {
  try {
    const token = await AsyncStorage.getItem("babytracker_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore
  }
  return config;
});

export default apiClient;
