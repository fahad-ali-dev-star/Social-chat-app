import Constants from "expo-constants";

// Automatically detect your PC's IP address when running via Expo Go on mobile,
// or fallback to live Render backend if EXPO_PUBLIC_BACKEND_URL is set.
const hostIp = Constants.expoConfig?.hostUri?.split(":")[0];
const defaultDevServer = hostIp ? `http://${hostIp}:5000` : "http://10.0.2.2:5000";

export const BASE_SERVER_URL = process.env.EXPO_PUBLIC_BACKEND_URL || defaultDevServer;
export const API_BASE_URL = `${BASE_SERVER_URL.replace(/\/+$/, "")}/api`;
export const SOCKET_SERVER_URL = BASE_SERVER_URL;
