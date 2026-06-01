import { StyleSheet, Text, View } from "react-native";

/** Student flow: live classroom games (Socket.io) — scaffold for partner UI. */
export default function StudentScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sınıf Oyunları</Text>
      <Text style={styles.body}>
        Canlı oyun oturumları Socket.io ile API üzerinden bağlanacak. Şimdilik
        öğrenci skorları ve ilerleme burada listelenecek.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: "#f8fafc" },
  title: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  body: { fontSize: 14, color: "#64748b", lineHeight: 22 },
});
