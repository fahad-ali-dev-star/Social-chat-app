import fetch from "node-fetch";
import User from "../models/User.js";

/**
 * Sends a push notification to a user via Expo Push Notification API.
 * @param {string} recipientId - MongoDB User ID of the recipient
 * @param {object} payload - { title, body, data, notificationType }
 */
export async function sendExpoPushNotification(recipientId, { title, body, data = {}, notificationType = "likes" }) {
  try {
    const user = await User.findById(recipientId).select("pushToken notificationSettings");
    if (!user || !user.pushToken) return;

    // Check notification preferences if present
    if (user.notificationSettings && notificationType in user.notificationSettings) {
      if (!user.notificationSettings[notificationType]) return;
    }

    const message = {
      to: user.pushToken,
      sound: "default",
      title: title || "Buzz Chat",
      body: body || "",
      data: data,
    };

    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    const result = await response.json();
    return result;
  } catch (err) {
    console.error("Error sending push notification via Expo:", err);
  }
}
