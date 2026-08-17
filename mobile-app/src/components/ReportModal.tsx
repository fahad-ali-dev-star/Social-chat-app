import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import api from "../api";

interface Props {
  visible: boolean;
  targetType: "user" | "post" | "comment" | "message";
  targetId: string;
  onClose: () => void;
}

const REASONS = [
  { id: "spam", label: "Spam or scam" },
  { id: "harassment", label: "Harassment or bullying" },
  { id: "hate", label: "Hate speech" },
  { id: "violence", label: "Violence or threats" },
  { id: "sexual_content", label: "Inappropriate content" },
  { id: "other", label: "Other" },
];

export default function ReportModal({ visible, targetType, targetId, onClose }: Props) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post("/reports", {
        targetType,
        targetId,
        reason,
        details: details.trim(),
      });
      Alert.alert("Report Submitted", "Thank you. Our moderation team will review this content.");
      onClose();
    } catch (err: any) {
      Alert.alert("Report Error", err?.response?.data?.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>Report {targetType}</Text>
          <Text style={styles.sub}>Help keep Buzz Chat safe for everyone.</Text>

          <Text style={styles.sectionTitle}>Select Reason</Text>
          {REASONS.map((r) => (
            <TouchableOpacity
              key={r.id}
              style={[styles.reasonRow, reason === r.id && styles.reasonSelected]}
              onPress={() => setReason(r.id)}
            >
              <Text style={[styles.reasonText, reason === r.id && styles.reasonSelectedText]}>
                {r.label}
              </Text>
            </TouchableOpacity>
          ))}

          <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Additional details (optional)</Text>
          <TextInput
            style={styles.input}
            placeholder="Explain why this content breaks rules..."
            placeholderTextColor="#64748b"
            value={details}
            onChangeText={setDetails}
            multiline
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.submitBtn}
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.submitText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 20,
  },
  content: {
    backgroundColor: "#1e293b",
    borderRadius: 20,
    padding: 20,
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
    textTransform: "capitalize",
  },
  sub: {
    color: "#94a3b8",
    fontSize: 13,
    marginBottom: 16,
  },
  sectionTitle: {
    color: "#cbd5e1",
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  reasonRow: {
    backgroundColor: "#0f172a",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 6,
  },
  reasonSelected: {
    backgroundColor: "#6366f1",
  },
  reasonText: {
    color: "#94a3b8",
    fontSize: 14,
  },
  reasonSelectedText: {
    color: "#fff",
    fontWeight: "bold",
  },
  input: {
    backgroundColor: "#0f172a",
    color: "#fff",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    height: 70,
    marginBottom: 16,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  cancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelText: {
    color: "#94a3b8",
  },
  submitBtn: {
    backgroundColor: "#ef4444",
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
