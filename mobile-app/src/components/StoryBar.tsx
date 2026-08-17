import React, { useEffect, useState } from "react";
import {
  ScrollView,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ActivityIndicator,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../api";
import { useAuthStore } from "../authStore";

export default function StoryBar() {
  const [stories, setStories] = useState<any[]>([]);
  const [activeStoryGroup, setActiveStoryGroup] = useState<any | null>(null);
  const [uploading, setUploading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    loadStories();
  }, []);

  const loadStories = async () => {
    try {
      const { data } = await api.get("/stories/feed");
      setStories(data.stories || []);
    } catch (err) {
      console.error("Failed to load stories", err);
    }
  };

  const handleAddStory = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow photo access to post a story.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setUploading(true);
      try {
        const formData = new FormData();
        const uri = result.assets[0].uri;
        const filename = uri.split("/").pop() || "story.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("file", { uri, name: filename, type } as any);

        const uploadRes = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        await api.post("/stories", { mediaUrl: uploadRes.data.url });
        loadStories();
      } catch (err) {
        console.error("Story upload failed", err);
        Alert.alert("Error", "Failed to upload story");
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Create Story Circle */}
        <TouchableOpacity style={styles.storyItem} onPress={handleAddStory} disabled={uploading}>
          <View style={styles.addCircle}>
            {uploading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.plusText}>＋</Text>
            )}
          </View>
          <Text style={styles.label} numberOfLines={1}>Your Story</Text>
        </TouchableOpacity>

        {/* Existing Stories */}
        {stories.map((group) => (
          <TouchableOpacity
            key={group.user?._id || group.user?.id}
            style={styles.storyItem}
            onPress={() => setActiveStoryGroup(group)}
          >
            <View style={styles.storyCircle}>
              <Text style={styles.storyAvatarText}>
                {group.user?.displayName?.[0] || group.user?.username?.[0] || "U"}
              </Text>
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {group.user?.displayName || group.user?.username}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Full-Screen Story Viewer */}
      {activeStoryGroup && (
        <Modal visible animationType="fade" onRequestClose={() => setActiveStoryGroup(null)}>
          <View style={styles.viewerContainer}>
            <Image
              source={{ uri: activeStoryGroup.stories?.[0]?.mediaUrl }}
              style={styles.fullImage}
              resizeMode="contain"
            />
            <TouchableOpacity
              style={styles.closeViewerBtn}
              onPress={() => setActiveStoryGroup(null)}
            >
              <Text style={styles.closeViewerText}>✕</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
    backgroundColor: "#0f172a",
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 14,
  },
  storyItem: {
    alignItems: "center",
    width: 64,
  },
  addCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#6366f1",
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1e293b",
    marginBottom: 4,
  },
  plusText: {
    color: "#6366f1",
    fontSize: 24,
    fontWeight: "bold",
  },
  storyCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: "#ec4899",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#6366f1",
    marginBottom: 4,
  },
  storyAvatarText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  label: {
    color: "#94a3b8",
    fontSize: 11,
    textAlign: "center",
  },
  viewerContainer: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  closeViewerBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  closeViewerText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
});
