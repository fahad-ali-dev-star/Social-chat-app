import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Redirect } from "expo-router";
import { useAuthStore } from "../authStore";

export default function AuthScreen() {
  const { user, loading, login, register, fetchMe } = useAuthStore();
  const [isRegisterMode, setIsRegisterMode] = useState(false);
  const [emailOrUsername, setEmailOrUsername] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetchMe();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color="#6366f1" />
        </View>
      </SafeAreaView>
    );
  }

  // If already authenticated, redirect to main Feed tab
  if (user) {
    return <Redirect href="/(tabs)/feed" />;
  }

  const handleAuth = async () => {
    setErrorMsg("");
    if (isRegisterMode) {
      if (!displayName.trim() || !username.trim() || !email.trim() || !password.trim()) {
        setErrorMsg("Please fill in all fields to create an account.");
        return;
      }
      setAuthLoading(true);
      try {
        await register(username.trim(), email.trim(), password.trim(), displayName.trim());
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || "Account creation failed.");
      } finally {
        setAuthLoading(false);
      }
    } else {
      if (!emailOrUsername.trim() || !password.trim()) {
        setErrorMsg("Please enter email/username and password.");
        return;
      }
      setAuthLoading(true);
      try {
        await login(emailOrUsername.trim(), password.trim());
      } catch (err: any) {
        setErrorMsg(err?.response?.data?.message || "Login failed.");
      } finally {
        setAuthLoading(false);
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
      <View style={styles.authContainer}>
        <Text style={styles.logoText}>🐝 Buzz Chat</Text>
        <Text style={styles.subText}>
          {isRegisterMode ? "Create a new account" : "Connect with friends on Buzz Chat"}
        </Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

        {isRegisterMode ? (
          <>
            <TextInput
              style={styles.input}
              placeholder="Full Name / Display Name"
              placeholderTextColor="#64748b"
              value={displayName}
              onChangeText={setDisplayName}
            />
            <TextInput
              style={styles.input}
              placeholder="Choose Username"
              placeholderTextColor="#64748b"
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.input}
              placeholder="Email Address"
              placeholderTextColor="#64748b"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </>
        ) : (
          <TextInput
            style={styles.input}
            placeholder="Username or Email"
            placeholderTextColor="#64748b"
            value={emailOrUsername}
            onChangeText={setEmailOrUsername}
            autoCapitalize="none"
          />
        )}

        <View style={styles.passwordWrapper}>
          <TextInput
            style={styles.passwordInput}
            placeholder="Password"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
          />
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword((v) => !v)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? "eye" : "eye-off"}
              size={20}
              color="#64748b"
            />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.btnPrimary}
          onPress={handleAuth}
          disabled={authLoading}
        >
          {authLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>
              {isRegisterMode ? "Create Account" : "Log In"}
            </Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.toggleAuthBtn}
          onPress={() => {
            setIsRegisterMode(!isRegisterMode);
            setErrorMsg("");
          }}
        >
          <Text style={styles.toggleAuthText}>
            {isRegisterMode
              ? "Already have an account? Log In"
              : "Don't have an account? Sign Up"}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  authContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  logoText: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#f8fafc",
    textAlign: "center",
  },
  subText: {
    fontSize: 14,
    color: "#94a3b8",
    textAlign: "center",
    marginBottom: 32,
  },
  errorText: {
    color: "#ef4444",
    textAlign: "center",
    marginBottom: 12,
  },
  input: {
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#334155",
  },
  passwordWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1e293b",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 16,
    paddingRight: 14,
  },
  passwordInput: {
    flex: 1,
    color: "#fff",
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  eyeBtn: {
    padding: 4,
  },
  btnPrimary: {
    backgroundColor: "#6366f1",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
  toggleAuthBtn: {
    marginTop: 20,
    alignItems: "center",
    paddingVertical: 8,
  },
  toggleAuthText: {
    color: "#a5b4fc",
    fontSize: 14,
    fontWeight: "600",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
