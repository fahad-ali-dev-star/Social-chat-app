let Notifications = null;

try {
  Notifications = require("expo-notifications");
  if (Notifications && typeof Notifications.setNotificationHandler === "function") {
    try {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: true,
        }),
      });
    } catch (e) {}
  }
} catch (e) {
  // Graceful fallback if expo-notifications is not available
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  try {
    const permRes = await Notifications.getPermissionsAsync().catch(() => null);
    const existingStatus = permRes?.status;
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const reqRes = await Notifications.requestPermissionsAsync().catch(() => null);
      finalStatus = reqRes?.status;
    }
    if (finalStatus !== "granted") {
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    return tokenData?.data || null;
  } catch (err) {
    return null;
  }
}

export async function triggerLocalNotification({ title, body, data = {} }) {
  if (Notifications && typeof Notifications.scheduleNotificationAsync === "function") {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: "default",
        },
        trigger: null,
      }).catch(() => {});
    } catch (err) {
      // Ignore local notification errors
    }
  }
}

export async function setAppBadgeCount(count) {
  if (Notifications && typeof Notifications.setBadgeCountAsync === "function") {
    try {
      await Notifications.setBadgeCountAsync(count).catch(() => {});
    } catch (err) {
      // Ignore badge errors on unsupported devices/emulators
    }
  }
}
