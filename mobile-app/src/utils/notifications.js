let Notifications = null;

try {
  Notifications = require("expo-notifications");
  if (Notifications && typeof Notifications.setNotificationHandler === "function") {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
      }),
    });
  }
} catch (e) {
  // Graceful fallback if expo-notifications is not available
}

export async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      return null;
    }
    const tokenData = await Notifications.getExpoPushTokenAsync().catch(() => null);
    return tokenData?.data || null;
  } catch (err) {
    console.error("Push token error:", err);
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
        trigger: null, // trigger immediately
      });
    } catch (err) {
      console.error("Local notification error:", err);
    }
  }
}

export async function setAppBadgeCount(count) {
  if (Notifications && typeof Notifications.setBadgeCountAsync === "function") {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (err) {
      // Ignore badge errors on unsupported devices/web/emulators
    }
  }
}
