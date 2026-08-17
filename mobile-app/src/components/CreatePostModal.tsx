import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import api from "../api";
import { usePostStore } from "../postStore";

interface Props {
  visible: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ visible, onClose }: Props) {
  const [content, setContent] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const createPost = usePostStore((s) => s.createPost);

  const pickImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert("Permission Needed", "Please allow access to your photos to upload media.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (!result.canceled && result.assets?.[0]?.uri) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handlePost = async () => {
    if (!content.trim() && !selectedImage) {
      Alert.alert("Empty Post", "Please write something or attach an image.");
      return;
    }

    setUploading(true);
    let uploadedMediaUrl = "";

    try {
      if (selectedImage) {
        const formData = new FormData();
        const filename = selectedImage.split("/").pop() || "photo.jpg";
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        formData.append("file", {
          uri: selectedImage,
          name: filename,
          type,
        } as any);

        const { data } = await api.post("/upload", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        uploadedMediaUrl = data.url;
      }

      await createPost(
        content.trim(),
        uploadedMediaUrl,
        uploadedMediaUrl ? [uploadedMediaUrl] : [],
        "image"
      );

      setContent("");
      setSelectedImage(null);
      onClose();
    } catch (err: any) {
      console.error("Failed to create post", err);
      Alert.alert("Upload Error", err?.response?.data?.message || "Failed to publish post.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.cancelBtn}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <Text style={styles.title}>New Post</Text>
            <TouchableOpacity
              onPress={handlePost}
              disabled={uploading || (!content.trim() && !selectedImage)}
              style={[
                styles.publishBtn,
                (!content.trim() && !selectedImage) && { opacity: 0.5 },
              ]}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.publishText}>Post</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Input */}
          <TextInput
            style={styles.input}
            placeholder="What's happening?"
            placeholderTextColor="#64748b"
            value={content}
            onChangeText={setContent}
            multiline
            autoFocus
          />

          {/* Media Preview */}
          {selectedImage && (
            <View style={styles.imagePreviewContainer}>
              <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              <TouchableOpacity
                style={styles.removeImageBtn}
                onPress={() => setSelectedImage(null)}
              >
                <Text style={styles.removeImageText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Toolbar */}
          <View style={styles.toolbar}>
            <TouchableOpacity style={styles.mediaBtn} onPress={pickImage}>
              <Text style={styles.mediaBtnText}>📷 Add Photo</Text>
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
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: "#1e293b",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: 32,
    minHeight: 350,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  title: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "bold",
  },
  cancelBtn: {
    padding: 4,
  },
  cancelText: {
    color: "#94a3b8",
    fontSize: 16,
  },
  publishBtn: {
    backgroundColor: "#6366f1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  publishText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  input: {
    color: "#fff",
    fontSize: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    minHeight: 120,
    textAlignVertical: "top",
  },
  imagePreviewContainer: {
    marginHorizontal: 20,
    marginBottom: 16,
    position: "relative",
  },
  imagePreview: {
    width: "100%",
    height: 200,
    borderRadius: 16,
  },
  removeImageBtn: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageText: {
    color: "#fff",
    fontWeight: "bold",
  },
  toolbar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  mediaBtn: {
    backgroundColor: "#334155",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
  },
  mediaBtnText: {
    color: "#a5b4fc",
    fontWeight: "600",
    fontSize: 14,
  },
});
