let LocalAuthentication = null;

try {
  LocalAuthentication = require("expo-local-authentication");
} catch (e) {
  // Graceful fallback if expo-local-authentication is not installed
}

/**
 * Checks if biometric hardware (FaceID / Fingerprint) is supported on the device.
 */
export async function isBiometricsSupported() {
  if (!LocalAuthentication) return false;
  try {
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();
    return hasHardware && isEnrolled;
  } catch (err) {
    return false;
  }
}

/**
 * Prompts the user to authenticate using FaceID / TouchID / Fingerprint.
 * @param {string} promptMessage Custom prompt message
 * @returns {Promise<boolean>} True if authentication succeeded
 */
export async function authenticateWithBiometrics(promptMessage = "Unlock Buzz Chat") {
  if (!LocalAuthentication) return false;
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage,
      fallbackLabel: "Use Password",
      cancelLabel: "Cancel",
      disableDeviceFallback: false,
    });
    return Boolean(result.success);
  } catch (err) {
    console.error("Biometric authentication error:", err);
    return false;
  }
}
