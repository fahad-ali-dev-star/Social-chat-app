import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Connect directly to your live backend on Render
const BACKEND_URL = "https://social-chat-app-9v5i.onrender.com/api";

const api = axios.create({
  baseURL: BACKEND_URL,
  timeout: 15000,
});

api.interceptors.request.use(async (config) => {
  const token = await AsyncStorage.getItem("buzz_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
