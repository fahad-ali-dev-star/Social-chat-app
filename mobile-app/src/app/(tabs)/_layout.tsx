import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationStore } from "../../notificationStore";
import { setAppBadgeCount } from "../../utils/notifications";

function BadgeIcon({
  name,
  color,
  size,
  badgeCount,
}: {
  name: any;
  color: string;
  size: number;
  badgeCount: number;
}) {
  return (
    <View style={{ width: size + 12, height: size + 4, alignItems: "center", justifyContent: "center" }}>
      <Ionicons name={name} size={size} color={color} />
      {badgeCount > 0 && (
        <View style={badgeStyles.badge}>
          <Text style={badgeStyles.badgeText}>
            {badgeCount > 99 ? "99+" : badgeCount}
          </Text>
        </View>
      )}
    </View>
  );
}

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const safePaddingBottom = Math.max(insets.bottom, 12);
  const tabHeight = 60 + safePaddingBottom;

  const unreadMsgCount = useNotificationStore((s) => s.unreadMsgCount);
  const unreadNotifCount = useNotificationStore((s) => s.unreadNotifCount);
  const initSocketAndPolling = useNotificationStore((s) => s.initSocketAndPolling);

  // Initialize socket, fetch unread counts, and set app icon badge
  useEffect(() => {
    initSocketAndPolling();
  }, []);

  // Update app icon badge whenever unread counts change
  useEffect(() => {
    const totalBadge = unreadMsgCount + unreadNotifCount;
    setAppBadgeCount(totalBadge);
  }, [unreadMsgCount, unreadNotifCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: "#11151D",
          borderTopColor: "#1E232E",
          borderTopWidth: 1,
          height: tabHeight,
          paddingBottom: safePaddingBottom,
          paddingTop: 8,
          elevation: 10,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: -3 },
          shadowOpacity: 0.35,
          shadowRadius: 6,
        },
        tabBarActiveTintColor: "#EC4899",
        tabBarInactiveTintColor: "#64748B",
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
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "videocam" : "videocam-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) => (
            <BadgeIcon
              name={focused ? "chatbubbles" : "chatbubbles-outline"}
              size={22}
              color={color}
              badgeCount={unreadMsgCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Alerts",
          tabBarIcon: ({ color, focused }) => (
            <BadgeIcon
              name={focused ? "notifications" : "notifications-outline"}
              size={22}
              color={color}
              badgeCount={unreadNotifCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          title: "Saved",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "bookmark" : "bookmark-outline"} size={22} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={22} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const badgeStyles = StyleSheet.create({
  badge: {
    position: "absolute",
    top: -2,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#EF4444",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: "#11151D",
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 12,
  },
});
