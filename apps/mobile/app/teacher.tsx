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
  Switch,
  Platform,
  Modal,
  TextInput
} from "react-native";
import { trpc, setActiveUserId } from "../lib/trpc";
import * as Notifications from "expo-notifications";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export default function TeacherScreen() {
  const [selectedTeacherId, setSelectedTeacherId] = useState<string | null>(null);
  const [selectedTeacherProfileId, setSelectedTeacherProfileId] = useState<string | null>(null);
  const [sandboxBypass, setSandboxBypass] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Hour Logging Form States
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const [logDate, setLogDate] = useState("");
  const [classType, setClassType] = useState<"group" | "private" | "online">("group");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");

  // Initialize today's date
  useEffect(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setLogDate(`${yyyy}-${mm}-${dd}`);
  }, []);

  // Open substitute requests queries and mutations
  const { data: openRequests, refetch: refetchOpenRequests } = trpc.alerts.getOpenSubstituteRequests.useQuery();
  const respondMutation = trpc.alerts.respondToSubstituteRequest.useMutation();
  const registerPushTokenMutation = trpc.alerts.registerPushToken.useMutation();

  // Register push notification token on mount or when selectedTeacherId changes
  useEffect(() => {
    if (!selectedTeacherId) return;

    async function registerForPushNotificationsAsync() {
      if (Platform.OS === 'web') return;
      
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync() as any;
        let finalStatus = existingStatus;
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync() as any;
          finalStatus = status;
        }
        if (finalStatus !== 'granted') {
          console.warn('Failed to get push token for push notification!');
          return;
        }
        
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Registered Expo Push Token:', token);

        if (token) {
          await registerPushTokenMutation.mutateAsync({ token });
        }
      } catch (error) {
        console.log('Expo push registration skipped or failed:', error);
      }
    }

    if (Platform.OS === 'android') {
      Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
      });
    }

    registerForPushNotificationsAsync();
  }, [selectedTeacherId]);

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

  // Hour logging queries and mutations
  const { 
    data: hourLogs, 
    isLoading: loadingHours, 
    refetch: refetchHours 
  } = trpc.hours.getMyHourLogs.useQuery(
    undefined, 
    { enabled: !!selectedTeacherProfileId }
  );

  const createHourLogMutation = trpc.hours.createManualHourLog.useMutation({
    onSuccess: (res) => {
      Alert.alert("Başarılı", `Saat kaydı oluşturuldu! Süre: ${res.hours} saat.`);
      setIsModalVisible(false);
      resetForm();
      refetchHours();
    },
    onError: (err) => {
      Alert.alert("Hata", err.message || "Saat kaydı oluşturulurken hata oluştu.");
    }
  });

  const updateHourLogMutation = trpc.hours.updateHourLog.useMutation({
    onSuccess: () => {
      Alert.alert("Başarılı", "Saat kaydı güncellendi!");
      setIsModalVisible(false);
      setEditingLogId(null);
      resetForm();
      refetchHours();
    },
    onError: (err) => {
      Alert.alert("Hata", err.message || "Güncelleme başarısız oldu.");
    }
  });

  // Helper to reset form to defaults
  const resetForm = () => {
    setNotes("");
    setDurationMinutes("60");
    setClassType("group");
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setLogDate(`${yyyy}-${mm}-${dd}`);
  };

  // Automatically refetch hour logs when active profile changes
  useEffect(() => {
    if (selectedTeacherProfileId) {
      refetchHours();
    }
  }, [selectedTeacherProfileId]);

  // Compute hours stats
  const stats = React.useMemo(() => {
    let approved = 0;
    let pending = 0;
    if (hourLogs) {
      for (const log of hourLogs) {
        if (log.status === "approved") {
          approved += Number(log.hours);
        } else if (log.status === "pending") {
          pending += Number(log.hours);
        }
      }
    }
    return {
      approved: Math.round((approved + Number.EPSILON) * 100) / 100,
      pending: Math.round((pending + Number.EPSILON) * 100) / 100,
      recent: hourLogs ? hourLogs.slice(0, 5) : []
    };
  }, [hourLogs]);

  const handleSubmitHourLog = () => {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(logDate)) {
      Alert.alert("Hata", "Lütfen tarihi YYYY-MM-DD formatında girin (Örn: 2026-06-05).");
      return;
    }

    const minutes = parseInt(durationMinutes, 10);
    if (isNaN(minutes) || minutes <= 0) {
      Alert.alert("Hata", "Lütfen geçerli bir süre (dakika) girin.");
      return;
    }

    if (editingLogId) {
      updateHourLogMutation.mutate({
        log_id: editingLogId,
        data: {
          log_date: logDate,
          class_type: classType,
          duration_minutes: minutes,
          notes: notes || undefined
        }
      });
    } else {
      createHourLogMutation.mutate({
        log_date: logDate,
        class_type: classType,
        duration_minutes: minutes,
        notes: notes || undefined
      });
    }
  };

  const formatAuditTrail = (trail: any[]) => {
    if (!trail || !Array.isArray(trail)) return "Kayıt bulunamadı.";
    return trail.map((t: any) => {
      const dateStr = new Date(t.at).toLocaleString("tr-TR");
      let actionLabel = "";
      if (t.action === "created") actionLabel = "Oluşturuldu";
      else if (t.action === "updated") actionLabel = "Güncellendi";
      else if (t.action === "approved") actionLabel = "Onaylandı";
      else if (t.action === "rejected") actionLabel = "Reddedildi";
      
      let detail = "";
      if (t.note) {
        detail = ` (Not: ${t.note})`;
      }
      return `• [${dateStr}] ${actionLabel}${detail}`;
    }).join("\n");
  };

  const showLogDetails = (log: any) => {
    const auditText = formatAuditTrail(log.audit_trail);
    const classTypeLabel = log.class_type === "group" ? "Grup Dersi" : log.class_type === "private" ? "Özel Ders" : "Online Ders";
    const statusLabel = log.status === "approved" ? "Onaylandı" : log.status === "pending" ? "Beklemede" : "Reddedildi";
    
    const buttons: Array<{ text: string; style?: "default" | "cancel" | "destructive"; onPress?: () => void }> = [
      { text: "Kapat", style: "cancel" }
    ];

    if (log.status === "pending") {
      buttons.push({
        text: "Düzenle",
        style: "default" as const,
        onPress: () => {
          setEditingLogId(log.id);
          setLogDate(log.log_date || "");
          setClassType(log.class_type || "group");
          setDurationMinutes(String(Math.round(Number(log.hours) * 60)));
          setNotes(log.notes || "");
          setIsModalVisible(true);
        }
      });
    }

    Alert.alert(
      "Saat Rapor Detayı",
      `Tarih: ${log.log_date || "-"}\nDers Tipi: ${classTypeLabel}\nSüre: ${log.hours} saat\nDurum: ${statusLabel}\nNot: ${log.notes || "-"}\n\nGeçmiş:\n${auditText}`,
      buttons
    );
  };

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
      await Promise.all([
        refetchSessions(),
        refetchOpenRequests(),
        refetchHours()
      ]);
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

      {/* Open Substitute Requests */}
      {selectedTeacherProfileId && openRequests && openRequests.length > 0 && (
        <View style={styles.subCard}>
          <Text style={styles.subHeaderTitle}>🚨 Açık Vekil Öğretmen Talepleri</Text>
          <Text style={{ color: "#94a3b8", fontSize: 11, marginBottom: 12 }}>
            Yardımcı olmak için aşağıdaki derslerden birini kabul edebilirsiniz.
          </Text>

          {openRequests.map((req) => (
            <View key={req.id} style={styles.subItem}>
              <View style={styles.subItemHeader}>
                <Text style={styles.subClassName}>{req.class_name}</Text>
                <Text style={styles.subTime}>{req.time_label}</Text>
              </View>
              <Text style={styles.subDetails}>
                Tarih: {req.session_date} | Talep Eden: {req.requesting_teacher_name}
              </Text>
              <View style={styles.subActions}>
                <TouchableOpacity
                  style={styles.subAcceptBtn}
                  onPress={() => {
                    Alert.alert(
                      "Talebi Kabul Et",
                      "Bu dersi vekil olarak üstlenmek istediğinizden emin misiniz?",
                      [
                        { text: "İptal", style: "cancel" },
                        { 
                          text: "Kabul Et", 
                          onPress: async () => {
                            try {
                              await respondMutation.mutateAsync({
                                request_id: req.id,
                                response: "accepted"
                              });
                              refetchOpenRequests();
                              refetchSessions();
                            } catch (e: any) {
                              Alert.alert("Hata", e.message || "Talebi kabul ederken bir hata oluştu.");
                            }
                          } 
                        }
                      ]
                    );
                  }}
                  disabled={respondMutation.isPending}
                >
                  <Text style={styles.subBtnText}>Kabul Et</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.subDeclineBtn}
                  onPress={() => {
                    Alert.alert(
                      "Talebi Reddet",
                      "Bu talebi reddetmek istediğinizden emin misiniz?",
                      [
                        { text: "İptal", style: "cancel" },
                        { 
                          text: "Reddet", 
                          onPress: async () => {
                            try {
                              await respondMutation.mutateAsync({
                                request_id: req.id,
                                response: "declined"
                              });
                              refetchOpenRequests();
                            } catch (e: any) {
                              Alert.alert("Hata", e.message || "Talebi reddederken bir hata oluştu.");
                            }
                          } 
                        }
                      ]
                    );
                  }}
                  disabled={respondMutation.isPending}
                >
                  <Text style={styles.subBtnText}>Reddet</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      )}

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
      {/* Hour Tracking Section */}
      {selectedTeacherProfileId && (
        <View style={styles.hoursSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Saat Takibi & Raporlama</Text>
            <TouchableOpacity 
              style={styles.addLogBtn}
              onPress={() => {
                setEditingLogId(null);
                resetForm();
                setIsModalVisible(true);
              }}
            >
              <Text style={styles.addLogBtnText}>+ Rapor Ekle</Text>
            </TouchableOpacity>
          </View>

          {/* Stats Cards */}
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Onaylanan</Text>
              <Text style={[styles.statValue, { color: "#10b981" }]}>
                {loadingHours ? "..." : `${stats.approved} sa`}
              </Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Bekleyen</Text>
              <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                {loadingHours ? "..." : `${stats.pending} sa`}
              </Text>
            </View>
          </View>

          {/* Recent Logs List */}
          <Text style={[styles.devSubtitle, { marginBottom: 8 }]}>Son 5 Saat Raporu:</Text>
          {loadingHours ? (
            <ActivityIndicator color="#8b5cf6" style={{ marginVertical: 12 }} />
          ) : !hourLogs || hourLogs.length === 0 ? (
            <View style={[styles.emptyCard, { padding: 16 }]}>
              <Text style={styles.emptyText}>Henüz saat raporu girilmemiş.</Text>
            </View>
          ) : (
            <View style={styles.logList}>
              {stats.recent.map((log) => {
                const isApproved = log.status === "approved";
                const isPending = log.status === "pending";
                const isRejected = log.status === "rejected";
                const statusColor = isApproved ? "#10b981" : isPending ? "#f59e0b" : "#ef4444";
                const statusLabel = isApproved ? "Onaylandı" : isPending ? "Beklemede" : "Reddedildi";

                const typeLabel = log.class_type === "group" ? "Grup Dersi" : log.class_type === "private" ? "Özel Ders" : "Online Ders";

                return (
                  <TouchableOpacity
                    key={log.id}
                    style={styles.logItem}
                    onPress={() => showLogDetails(log)}
                  >
                    <View style={styles.logLeft}>
                      <Text style={styles.logType}>{typeLabel}</Text>
                      <Text style={styles.logMeta}>{log.log_date}</Text>
                    </View>
                    <View style={styles.logRight}>
                      <Text style={styles.logHours}>{log.hours} Saat</Text>
                      <View style={[styles.logStatusBadge, { borderColor: statusColor + "30", backgroundColor: statusColor + "15" }]}>
                        <Text style={[styles.logStatusText, { color: statusColor }]}>{statusLabel}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>
      )}

      {/* Manual Hour Log Modal */}
      <Modal
        visible={isModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}>
            <View style={styles.modalContainer}>
              <Text style={styles.modalTitle}>
                {editingLogId ? "Saat Raporunu Düzenle" : "Manuel Saat Raporu Ekle"}
              </Text>

              {/* Date Input */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Tarih (YYYY-MM-DD)</Text>
                <TextInput
                  style={styles.input}
                  value={logDate}
                  onChangeText={setLogDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Class Type Selector */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Ders Tipi</Text>
                <View style={styles.typeSelector}>
                  {(["group", "private", "online"] as const).map((type) => {
                    const isActive = classType === type;
                    const label = type === "group" ? "Grup" : type === "private" ? "Özel" : "Online";
                    return (
                      <TouchableOpacity
                        key={type}
                        style={[styles.selectorBtn, isActive && styles.selectorBtnActive]}
                        onPress={() => setClassType(type)}
                      >
                        <Text style={[styles.selectorBtnText, isActive && styles.selectorBtnTextActive]}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Duration Input */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Süre (Dakika)</Text>
                <View style={styles.presetRow}>
                  {([45, 60, 90, 120] as const).map((mins) => {
                    const isActive = durationMinutes === String(mins);
                    return (
                      <TouchableOpacity
                        key={mins}
                        style={[styles.presetBtn, isActive && styles.presetBtnActive]}
                        onPress={() => setDurationMinutes(String(mins))}
                      >
                        <Text style={[styles.presetBtnText, isActive && styles.presetBtnTextActive]}>
                          {mins} Dk
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TextInput
                  style={styles.input}
                  value={durationMinutes}
                  onChangeText={setDurationMinutes}
                  keyboardType="numeric"
                  placeholder="Diğer dakika (örn: 50)"
                  placeholderTextColor="#64748b"
                />
              </View>

              {/* Notes Input */}
              <View style={styles.fieldContainer}>
                <Text style={styles.fieldLabel}>Açıklama / Ders Konusu (İsteğe Bağlı)</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={notes}
                  onChangeText={setNotes}
                  placeholder="Ders notları, işlenen konu..."
                  placeholderTextColor="#64748b"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => {
                    setIsModalVisible(false);
                    setEditingLogId(null);
                  }}
                  disabled={createHourLogMutation.isPending || updateHourLogMutation.isPending}
                >
                  <Text style={styles.modalBtnText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSubmitHourLog}
                  disabled={createHourLogMutation.isPending || updateHourLogMutation.isPending}
                >
                  {createHourLogMutation.isPending || updateHourLogMutation.isPending ? (
                    <ActivityIndicator color="#ffffff" size="small" />
                  ) : (
                    <Text style={styles.modalBtnText}>Kaydet</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  completedText: { color: "#94a3b8", fontSize: 12, fontWeight: "600" },
  subCard: {
    backgroundColor: "#1e1b4b15",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#8b5cf630",
    marginBottom: 16,
    marginTop: 8,
  },
  subHeaderTitle: { fontSize: 14, fontWeight: "700", color: "#a78bfa", marginBottom: 2 },
  subItem: {
    backgroundColor: "#0b1329",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    marginBottom: 8,
  },
  subItemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  subClassName: { fontSize: 14, fontWeight: "700", color: "#ffffff" },
  subTime: { 
    fontSize: 10, 
    fontWeight: "600", 
    color: "#cbd5e1", 
    backgroundColor: "#020617", 
    paddingHorizontal: 6, 
    paddingVertical: 2, 
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#1e293b",
  },
  subDetails: { color: "#64748b", fontSize: 11, marginBottom: 8, fontWeight: "500" },
  subActions: { flexDirection: "row", gap: 8 },
  subAcceptBtn: {
    flex: 1,
    backgroundColor: "#10b981",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  subDeclineBtn: {
    flex: 1,
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 8,
    borderRadius: 8,
    alignItems: "center",
  },
  subBtnText: { color: "#ffffff", fontWeight: "700", fontSize: 11 },
  hoursSection: {
    marginTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
    paddingTop: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#ffffff",
  },
  addLogBtn: {
    backgroundColor: "#6d28d9",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addLogBtnText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#0b1329",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
  },
  statLabel: {
    color: "#94a3b8",
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  logList: {
    gap: 8,
  },
  logItem: {
    backgroundColor: "#0b1329",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#1e293b",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logLeft: {
    flex: 1,
    marginRight: 8,
  },
  logType: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  logMeta: {
    color: "#64748b",
    fontSize: 11,
    fontWeight: "500",
  },
  logRight: {
    alignItems: "flex-end",
  },
  logHours: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 4,
  },
  logStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    borderWidth: 1,
  },
  logStatusText: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(2, 6, 23, 0.85)",
    justifyContent: "center",
    padding: 20,
  },
  modalContainer: {
    backgroundColor: "#0b1329",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1e293b",
    padding: 24,
    maxHeight: "90%",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#ffffff",
    marginBottom: 20,
    textAlign: "center",
  },
  fieldContainer: {
    marginBottom: 16,
  },
  fieldLabel: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "#020617",
    borderWidth: 1,
    borderColor: "#1e293b",
    borderRadius: 10,
    color: "#ffffff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: "top",
  },
  typeSelector: {
    flexDirection: "row",
    gap: 8,
  },
  selectorBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  selectorBtnActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  selectorBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  selectorBtnTextActive: {
    color: "#ffffff",
  },
  presetRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    borderRadius: 8,
    paddingVertical: 8,
    alignItems: "center",
  },
  presetBtnActive: {
    backgroundColor: "#6d28d9",
    borderColor: "#8b5cf6",
  },
  presetBtnText: {
    color: "#94a3b8",
    fontSize: 12,
    fontWeight: "600",
  },
  presetBtnTextActive: {
    color: "#ffffff",
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderWidth: 1,
    borderColor: "#334155",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: "#6d28d9",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalBtnText: {
    color: "#ffffff",
    fontWeight: "700",
    fontSize: 13,
  }
});
