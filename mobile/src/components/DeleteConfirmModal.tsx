import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

interface Props {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function DeleteConfirmModal({
  visible,
  onConfirm,
  onCancel,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Delete this log?</Text>
          <Text style={styles.body}>This action cannot be undone.</Text>
          <View style={styles.row}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onCancel}
              activeOpacity={0.8}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteBtn}
              onPress={onConfirm}
              activeOpacity={0.8}
            >
              <Text style={styles.deleteText}>Delete</Text>
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
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  sheet: {
    width: "100%",
    maxWidth: 320,
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 24,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    color: "#aaa",
    textAlign: "center",
    marginBottom: 20,
  },
  row: { flexDirection: "row", gap: 12 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  cancelText: { fontSize: 14, fontWeight: "600", color: "#666" },
  deleteBtn: {
    flex: 1,
    backgroundColor: "#ef4444",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
  },
  deleteText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
