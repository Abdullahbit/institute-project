import { Link } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { trpc } from "../lib/trpc";

export default function HomeScreen() {
  const health = trpc.health.check.useQuery();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Institute Mobile</Text>
      <Text style={styles.subtitle}>Expo · Teacher & Student apps</Text>
      <Text style={styles.api}>
        API: {health.data?.status ?? (health.isLoading ? "…" : "offline")}
      </Text>
      <Link href="/teacher" style={styles.link}>
        <Text style={styles.linkText}>Öğretmen paneli</Text>
      </Link>
      <Link href="/student" style={styles.link}>
        <Text style={styles.linkText}>Öğrenci (oyunlar)</Text>
      </Link>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#f8fafc",
  },
  title: { fontSize: 24, fontWeight: "600", color: "#0f172a" },
  subtitle: { fontSize: 14, color: "#64748b", marginTop: 8 },
  api: { fontSize: 12, color: "#94a3b8", marginTop: 16, marginBottom: 24 },
  link: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e2e8f0",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
  },
  linkText: { fontSize: 16, color: "#0f172a" },
});
