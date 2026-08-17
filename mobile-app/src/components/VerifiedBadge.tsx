import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  size?: number;
}

export default function VerifiedBadge({ size = 16 }: Props) {
  const badgeSize = size;
  const fontSize = Math.max(9, Math.floor(size * 0.65));

  return (
    <View
      style={[
        styles.badge,
        {
          width: badgeSize,
          height: badgeSize,
          borderRadius: badgeSize / 2,
        },
      ]}
    >
      <Text style={[styles.checkmark, { fontSize }]}>✓</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#1d9bf0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 4,
  },
  checkmark: {
    color: "#ffffff",
    fontWeight: "900",
    textAlign: "center",
    lineHeight: 14,
  },
});
