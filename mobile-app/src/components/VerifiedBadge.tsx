import React from "react";
import { View, StyleSheet } from "react-native";

interface Props {
  size?: number;
}

/**
 * Blue scalloped badge with a centered white checkmark.
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
        },
      ]}
      accessibilityLabel="Verified"
    >
      {Array.from({ length: 12 }, (_value, index) => (
        <View
          key={index}
          style={[
            styles.scallop,
            {
              width: size * 0.3,
              height: size * 0.3,
              borderRadius: size * 0.15,
              left: size * 0.35 + Math.cos((index * 30 * Math.PI) / 180) * size * 0.3,
              top: size * 0.35 + Math.sin((index * 30 * Math.PI) / 180) * size * 0.3,
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.center,
          {
            width: size * 0.82,
            height: size * 0.82,
            borderRadius: size * 0.41,
            left: size * 0.09,
            top: size * 0.09,
          },
        ]}
      />
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
    position: "relative",
    marginLeft: 3,
  },
  scallop: {
    position: "absolute",
    backgroundColor: "#1D9BF0",
  },
  center: {
    position: "absolute",
    backgroundColor: "#1D9BF0",
  },
  bar: {
    position: "absolute",
    backgroundColor: "#FFFFFF",
    borderRadius: 1,
  },
});
