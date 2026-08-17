import Constants from "expo-constants";

// Primary live backend server for native app
export const LIVE_BACKEND_URL = "https://social-chat-appserver.onrender.com";

const hostIp = Constants.expoConfig?.hostUri?.split(":")[0];
const devServerUrl = hostIp ? `http://${hostIp}:5000` : null;

// Default to live backend URL https://social-chat-appserver.onrender.com
export const BASE_SERVER_URL = process.env.EXPO_PUBLIC_BACKEND_URL || LIVE_BACKEND_URL;
export const API_BASE_URL = `${BASE_SERVER_URL.replace(/\/+$/, "")}/api`;
export const SOCKET_SERVER_URL = BASE_SERVER_URL.replace(/\/+$/, "");
