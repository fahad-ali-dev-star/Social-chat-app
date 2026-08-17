import { Tabs } from "expo-router";
import { useColorScheme, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Colors } from "@/constants/theme";

export default function TabLayout() {
  const scheme = useColorScheme();
  const colors = Colors[scheme === "dark" ? "dark" : "light"];
  const insets = useSafeAreaInsets();

  const safePaddingBottom = Math.max(insets.bottom, 12);
  const tabHeight = 58 + safePaddingBottom;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#0f172a",
          borderTopColor: "#1e293b",
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: safePaddingBottom,
          paddingTop: 8,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
        },
        tabBarActiveTintColor: "#6366f1",
        tabBarInactiveTintColor: "#64748b",
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="feed"
        options={{
          title: "Home",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🏠</Text>,
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🔍</Text>,
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chats",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>💬</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🔔</Text>,
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "Saved",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>🔖</Text>,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => <Text style={[styles.icon, { color }]}>👤</Text>,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  icon: {
    fontSize: 18,
  },
});
