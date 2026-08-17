import React from "react";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  size?: number;
}

export default function VerifiedBadge({ size = 16 }: Props) {
  return (
    <Ionicons
      name="checkmark-circle"
      size={size}
      color="#38bdf8"
      style={{ marginLeft: 2 }}
    />
  );
}
