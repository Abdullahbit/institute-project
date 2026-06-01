import { ScrollView, StyleSheet, Text, View } from "react-native";
import { trpc } from "../lib/trpc";

export default function TeacherScreen() {
  const { data, isLoading } = trpc.dashboard.summary.useQuery();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Bugün</Text>
      {isLoading && <Text style={styles.muted}>Yükleniyor…</Text>}
      {data && (
        <>
          <View style={styles.card}>
            <Text style={styles.stat}>{data.lessons_today}</Text>
            <Text style={styles.label}>Ders</Text>
          </View>
          <Text style={styles.section}>Program</Text>
          {data.today_schedule.map((lesson) => (
            <View key={lesson.id} style={styles.row}>
              <Text style={styles.rowTitle}>{lesson.class_name}</Text>
              <Text style={styles.muted}>
                {lesson.time_label} · {lesson.teacher_name}
              </Text>
            </View>
          ))}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  content: { padding: 16 },
  heading: { fontSize: 20, fontWeight: "600", marginBottom: 12 },
  card: {
    backgroundColor: "#fff",
    padding: 20,
    borderRadius: 8,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  stat: { fontSize: 32, fontWeight: "700" },
  label: { color: "#64748b", marginTop: 4 },
  section: { fontSize: 16, fontWeight: "600", marginBottom: 8 },
  row: {
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#e2e8f0",
  },
  rowTitle: { fontWeight: "500" },
  muted: { fontSize: 12, color: "#64748b", marginTop: 4 },
});
