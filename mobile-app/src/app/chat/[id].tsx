import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  Image,
  StatusBar as RNStatusBar,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import api from "../../api";
import { useMessageStore } from "../../messageStore";
import { useAuthStore } from "../../authStore";

export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { messages, messagesLoading, loadMessages, sendMessage } = useMessageStore();
  const currentUser = useAuthStore((s) => s.user);
  const insets = useSafeAreaInsets();

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recipient, setRecipient] = useState<any>(null);

  const paddingTop = Math.max(insets.top, Platform.OS === "android" ? RNStatusBar.currentHeight || 12 : 12);
  const paddingBottom = Math.max(insets.bottom + 10, 20);

  useEffect(() => {
    if (id) {
      loadMessages(id);
      fetchConversationDetails();
    }
  }, [id]);

  const fetchConversationDetails = async () => {
    try {
      const { data } = await api.get("/messages");
      const conv = (data.conversations || []).find((c: any) => c._id === id);
      if (conv) {
        const other = conv.participants?.find(
          (p: any) => String(p._id || p.id) !== String(currentUser?.id)
        );
        setRecipient(other);
      }
    } catch (err) {
      console.error("Failed to fetch conversation details", err);
    }
  };

  const handleSend = async () => {
    if (!text.trim() || !id) return;
    const body = text.trim();
    setText("");
    setSending(true);
    try {
      await sendMessage(id, body);
    } catch (err) {
      console.error("Send error", err);
    } finally {
      setSending(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.recipientInfo}>
          {recipient?.avatarUrl ? (
            <Image source={{ uri: recipient.avatarUrl }} style={styles.avatarImage} />
          ) : (
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {recipient?.displayName?.[0] || recipient?.username?.[0] || "U"}
              </Text>
            </View>
          )}
          <View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
              <Text style={styles.recipientName}>
                {recipient?.displayName || recipient?.username || "Chat"}
              </Text>
            </View>
            {recipient?.username ? (
              <Text style={styles.username}>@{recipient.username}</Text>
            ) : null}
          </View>
        </View>
      </View>

      {/* Chat Messages */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {messagesLoading && messages.length === 0 ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator color="#6366f1" size="large" />
          </View>
        ) : (
          <FlatList
            data={messages}
            keyExtractor={(item) => item._id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            renderItem={({ item }) => {
              const isMine =
                String(item.sender?._id || item.sender?.id || item.sender) ===
                String(currentUser?.id);

              return (
                <View
                  style={[
                    styles.bubble,
                    isMine ? styles.myBubble : styles.theirBubble,
                  ]}
                >
                  <Text style={[styles.bubbleText, isMine ? styles.myText : styles.theirText]}>
                    {item.body}
                  </Text>
                  {item.mediaUrl ? (
                    <Image source={{ uri: item.mediaUrl }} style={styles.mediaImage} />
                  ) : null}
                </View>
              );
            }}
          />
        )}

        {/* Input Bar with Bottom Padding */}
        <View style={[styles.inputContainer, { paddingBottom }]}>
          <TextInput
            style={styles.input}
            placeholder="Type a message..."
            placeholderTextColor="#64748b"
            value={text}
            onChangeText={setText}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, !text.trim() && { opacity: 0.5 }]}
            onPress={handleSend}
            disabled={sending || !text.trim()}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.sendText}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0f172a",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    gap: 12,
  },
  backBtn: {
    paddingVertical: 4,
  },
  backText: {
    color: "#6366f1",
    fontSize: 16,
    fontWeight: "bold",
  },
  recipientInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#6366f1",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  recipientName: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },
  username: {
    color: "#64748b",
    fontSize: 11,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bubble: {
    maxWidth: "80%",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
    marginVertical: 2,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#6366f1",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: "#1e293b",
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    fontSize: 15,
    lineHeight: 20,
  },
  myText: {
    color: "#fff",
  },
  theirText: {
    color: "#e2e8f0",
  },
  mediaImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginTop: 6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingTop: 12,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    color: "#fff",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    maxHeight: 100,
  },
  sendBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  sendText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
});
