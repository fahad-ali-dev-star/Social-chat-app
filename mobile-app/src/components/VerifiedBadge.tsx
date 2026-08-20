import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  size?: number;
}

/**
 * Instagram verified badge: #0095F6 circle with a white checkmark.
 */
export default function VerifiedBadge({ size = 12 }: Props) {
  const stemW = size * 0.22;
  const stemH = Math.max(1.6, size * 0.13);
  const armW = size * 0.4;
  const armH = Math.max(1.6, size * 0.13);

  return (
    <View
      style={[
        styles.badge,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
        },
      ]}
      accessibilityLabel="Verified"
    >
      <View
        style={[
          styles.bar,
          {
            width: stemW,
            height: stemH,
            left: size * 0.2,
            top: size * 0.48,
            transform: [{ rotate: "45deg" }],
          },
        ]}
      />
      <View
        style={[
          styles.bar,
          {
            width: armW,
            height: armH,
            left: size * 0.32,
            top: size * 0.4,
            transform: [{ rotate: "-50deg" }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    backgroundColor: "#0095F6",
    marginLeft: 3,
    overflow: "hidden",
  },
  bar: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
});
