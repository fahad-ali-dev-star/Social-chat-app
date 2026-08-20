import { useEffect } from "react";
import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useNotificationStore } from "../../notificationStore";
import { setAppBadgeCount } from "../../utils/notifications";
import { IG } from "../../constants/theme";

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
  const tabHeight = 56 + safePaddingBottom;

  const unreadMsgCount = useNotificationStore((s) => s.unreadMsgCount);
  const unreadNotifCount = useNotificationStore((s) => s.unreadNotifCount);
  const initSocketAndPolling = useNotificationStore((s) => s.initSocketAndPolling);

  useEffect(() => {
    initSocketAndPolling();
  }, []);

  useEffect(() => {
    setAppBadgeCount(unreadMsgCount + unreadNotifCount);
  }, [unreadMsgCount, unreadNotifCount]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: IG.tabBar,
          borderTopColor: IG.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: tabHeight,
          paddingBottom: safePaddingBottom,
          paddingTop: 6,
        },
        tabBarActiveTintColor: IG.tabActive,
        tabBarInactiveTintColor: IG.tabInactive,
        tabBarLabelStyle: {
          fontSize: 10,
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
            <Ionicons name={focused ? "home" : "home-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="reels"
        options={{
          title: "Reels",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "play-circle" : "play-circle-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: "Search",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="messages"
        options={{
          title: "Messages",
          tabBarIcon: ({ color, focused }) => (
            <BadgeIcon
              name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"}
              size={24}
              color={color}
              badgeCount={unreadMsgCount}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person-circle" : "person-circle-outline"} size={26} color={color} />
          ),
        }}
      />
      {/* Hidden from tab bar — reachable via header / profile */}
      <Tabs.Screen
        name="notifications"
        options={{
          href: null,
          title: "Notifications",
        }}
      />
      <Tabs.Screen
        name="bookmarks"
        options={{
          href: null,
          title: "Saved",
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
    backgroundColor: IG.like,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    borderWidth: 1.5,
    borderColor: IG.bg,
  },
  badgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "bold",
    lineHeight: 12,
  },
});
