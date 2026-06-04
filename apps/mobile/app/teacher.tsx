import React, { useState, useEffect } from "react";
import { 
  ScrollView, 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  RefreshControl,
  Switch
} from "react-native";
import { trpc, setActiveUserId } from "../lib/trpc";

export default function TeacherScreen() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacherProfileId, setSelectedTeacherProfileId] = useState<string | null>(null);
  const [sandboxBypass, setSandboxBypass] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Fetch all teachers to allow profile selection in Dev Sandbox
  const { data: teachersList, isLoading: loadingTeachers, refetch: refetchTeachers } = trpc.teachers.list.useQuery();

  // Find currently selected teacher object
  const selectedTeacher = teachersList?.find((t) => t.id === selectedTeacherProfileId);

  // Fetch today's sessions for selected teacher
  const { 
    data: sessions, 
    isLoading: loadingSessions, 
    refetch: refetchSessions,
    isFetching: isFetchingSessions
  } = trpc.schedule.getTodaySessions.useQuery(
    { teacher_id: selectedTeacherProfileId || "" },
    { enabled: !!selectedTeacherProfileId }
  );

  // tRPC Mutations
  const checkInMutation = trpc.schedule.checkIn.useMutation({
    onSuccess: () => {
      Alert.alert("Başarılı", "Derse başarıyla giriş yapıldı!");
      refetchSessions();
    },
    onError: (err) => {
      Alert.alert("Hata", err.message || "Giriş işlemi başarısız oldu.");
    }
  });

  const checkOutMutation = trpc.schedule.checkOut.useMutation({
    onSuccess: (data) => {
      Alert.alert("Başarılı", `Ders tamamlandı! Süre: ${data.hours} saat. Saat kaydı otomatik oluşturuldu.`);
      refetchSessions();
    },
    onError: (err) => {
      Alert.alert("Hata", err.message || "Çıkış işlemi başarısız oldu.");
    }
  });

  const handleTeacherSelect = (teacher: any) => {
    setSelectedTeacherProfileId(teacher.id);
    setSelectedTeacherId(teacher.user_id);
    setActiveUserId(teacher.user_id); // Set in request header
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetchTeachers();
    if (selectedTeacherProfileId) {
      await refetchSessions();
    }
    setIsRefreshing(false);
  };

  const handleCheckIn = (sessionId: string, startTime: string) => {
    if (!sandboxBypass) {
      // Perform time-window check
      const now = new Date();
      const [hour, min] = startTime.split(":");
      const sessionStart = new Date();
      sessionStart.setHours(Number(hour), Number(min), 0, 0);
      const diffMs = Math.abs(now.getTime() - sessionStart.getTime());
      if (diffMs > 30 * 60 * 1000) {
        Alert.alert("Hata", "Ders başlangıç saatine 30 dakikadan fazla süre var.");
        return;
      }
    }

    checkInMutation.mutate({ session_id: sessionId });
  };

  const handleCheckOut = (sessionId: string) => {
    Alert.alert(
      "Dersi Sonlandır",
      "Dersi tamamlamak istediğinizden emin misiniz?",
      [
        { text: "İptal", style: "cancel" },
        { 
          text: "Tamamla", 
          onPress: () => checkOutMutation.mutate({ session_id: sessionId }) 
        }
      ]
    );
  };

  // Helper to determine status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
      case "in_progress":
        return "#10b981"; // green
      case "completed":
        return "#6366f1"; // blue
      case "late":
        return "#f59e0b"; // orange
      case "no_show":
        return "#ef4444"; // red
      default:
        return "#64748b"; // grey
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "ongoing":
      case "in_progress":
        return "Devam Ediyor";
      case "completed":
        return "Tamamlandı";
      case "late":
        return "Gecikme";
      case "no_show":
        return "Gelmedi";
      default:
        return "Planlandı";
    }
  };

  return (
    <ScrollView 
      style={styles.container} 
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={handleRefresh} 
          tintColor="#8b5cf6" 
          colors={["#8b5cf6"]} 
        />
      }
    >
      {/* Dev Account Selector */}
      <View style={styles.devCard}>
        <Text style={styles.devTitle}>🛠️ Dev Mode: Profil Seçimi</Text>
        <Text style={styles.devSubtitle}>Ders seanslarını listelemek için aktif öğretmen seçin:</Text>
        
        {loadingTeachers && <ActivityIndicator color="#8b5cf6" style={{ marginVertical: 8 }} />}
        
        <View style={styles.teacherGrid}>
          {teachersList?.map((t) => {
            const isSelected = selectedTeacherProfileId === t.id;
            return (
              <TouchableOpacity
                key={t.id}
                style={[styles.teacherBtn, isSelected && styles.teacherBtnActive]}
                onPress={() => handleTeacherSelect(t)}
              >
                <Text style={[styles.teacherBtnText, isSelected && styles.teacherBtnTextActive]}>
                  {t.full_name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.sandboxRow}>
          <Text style={styles.sandboxLabel}>Sandbox Süre Aşımını Devre Dışı Bırak</Text>
          <Switch 
            value={sandboxBypass} 
            onValueChange={setSandboxBypass}
            trackColor={{ false: "#1e293b", true: "#6d28d9" }}
            thumbColor={sandboxBypass ? "#a78bfa" : "#94a3b8"}
          />
        </View>
      </View>

      {/* Screen Title */}
      <Text style={styles.heading}>Bugünkü Derslerim</Text>

      {/* Sessions Content */}
      {!selectedTeacherProfileId ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>Lütfen yukarıdan bir eğitmen profili seçin.</Text>
        </View>
      ) : loadingSessions || isFetchingSessions ? (
        <ActivityIndicator color="#8b5cf6" size="large" style={{ marginVertical: 40 }} />
      ) : !sessions || sessions.length === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyText}>🎉 Bugün dersiniz bulunmamaktadır. İyi günler!</Text>
        </View>
      ) : (
        sessions.map((session) => {
          const isScheduled = session.status === "scheduled" || session.status === "late";
          const isOngoing = session.status === "ongoing" || session.status === "in_progress";
          const isCompleted = session.status === "completed";
          const statusColor = getStatusColor(session.status);

          return (
            <View key={session.id} style={styles.sessionCard}>
              {/* Header */}
              <View style={styles.cardHeader}>
                <View>
                  <Text style={styles.classTitle}>{session.class_name}</Text>
                  <View style={[styles.statusBadge, { borderColor: statusColor + "30", backgroundColor: statusColor + "15" }]}>
                    <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                    <Text style={[styles.statusText, { color: statusColor }]}>
                      {getStatusLabel(session.status)}
                    </Text>
                  </View>
                </View>
                
                <Text style={styles.timeBadge}>{session.time_label}</Text>
              </View>

              {/* Details */}
              <View style={styles.detailsBox}>
                <Text style={styles.detailsText}>📍 Oda: Sınıf A</Text>
                <Text style={styles.detailsText}>👤 Eğitmen: {session.teacher_name}</Text>
              </View>

              {/* Actions */}
              {isScheduled && (
                <TouchableOpacity
                  style={styles.checkInBtn}
                  onPress={() => handleCheckIn(session.id, session.time_label.split(" - ")[0])}
                  disabled={checkInMutation.isPending}
                >
                  <Text style={styles.btnText}>Ders Başlat (Check In)</Text>
                </TouchableOpacity>
              )}

              {isOngoing && (
                <TouchableOpacity
                  style={styles.checkOutBtn}
                  onPress={() => handleCheckOut(session.id)}
                  disabled={checkOutMutation.isPending}
                >
                  <Text style={styles.btnText}>Seansı Bitir (Check Out)</Text>
                </TouchableOpacity>
              )}

              {isCompleted && (
                <View style={styles.completedBadge}>
                  <Text style={styles.completedText}>✓ Saat kaydı otomatik oluşturuldu.</Text>
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  content: { padding: 16, paddingBottom: 40 },
  heading: { fontSize: 22, fontWeight: "800", color: "#ffffff", marginVertical: 16 },
  devCard: {
    backgroundColor: "#0f172a",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#334155",
    marginBottom: 8,
  },
  devTitle: { color: "#a78bfa", fontWeight: "700", fontSize: 14, marginBottom: 4 },
  devSubtitle: { color: "#94a3b8", fontSize: 11, marginBottom: 12 },
  teacherGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
  teacherBtn: {
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#475569",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  teacherBtnActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  teacherBtnText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  teacherBtnTextActive: { color: "#ffffff" },
  sandboxRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 12,
    marginTop: 4,
  },
  sandboxLabel: { color: "#cbd5e1", fontSize: 11, fontWeight: "500" },
  emptyCard: {
    backgroundColor: "#0b1329",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
  },
  emptyText: { color: "#64748b", fontSize: 13, fontWeight: "500", textAlign: "center" },
  sessionCard: {
    backgroundColor: "#0b1329",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 12,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  classTitle: { fontSize: 16, fontWeight: "700", color: "#ffffff", marginBottom: 4 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    alignSelf: "flex-start",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 6 },
  statusText: { fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  timeBadge: {
    backgroundColor: "#020617",
    color: "#e2e8f0",
    fontSize: 11,
    fontWeight: "700",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  detailsBox: {
    backgroundColor: "#020617",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 16,
  },
  detailsText: { color: "#94a3b8", fontSize: 11, marginBottom: 4, fontWeight: "500" },
  checkInBtn: {
    backgroundColor: "#10b981",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  checkOutBtn: {
    backgroundColor: "#6366f1",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  btnText: { color: "#ffffff", fontWeight: "700", fontSize: 13 },
  completedBadge: {
    backgroundColor: "#47556920",
    borderWidth: 1,
    borderColor: "#47556930",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  completedText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" }
});
