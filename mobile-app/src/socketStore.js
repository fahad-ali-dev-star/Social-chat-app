import { io } from "socket.io-client";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SOCKET_SERVER_URL } from "./config";
import { useNotificationStore } from "./notificationStore";
import { useMessageStore } from "./messageStore";

let socket = null;

export const getSocket = () => socket;

export const initSocket = async () => {
  if (socket) return socket;

  const token = await AsyncStorage.getItem("buzz_token");
  if (!token) return null;

  socket = io(SOCKET_SERVER_URL, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on("connect", () => {
    console.log("⚡ Socket.IO Connected to:", SOCKET_SERVER_URL);
  });

  socket.on("notification", (notif) => {
    useNotificationStore.getState().addNotification(notif);
    useNotificationStore.getState().fetchUnreadCounts();
  });

  socket.on("new_message", ({ message, conversationId }) => {
    useMessageStore.getState().addIncomingMessage(message, conversationId);
    useNotificationStore.getState().fetchUnreadCounts();
  });

  socket.on("message_updated", ({ message }) => {
    useMessageStore.getState().updateIncomingMessage(message);
  });

  socket.on("message_deleted", (payload) => {
    useMessageStore.getState().deleteIncomingMessage(payload);
  });

  socket.on("disconnect", () => {
    console.log("⚡ Socket.IO Disconnected");
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
