import { pgTable, uuid, text, boolean, timestamp, integer, numeric, date, time, jsonb } from "drizzle-orm/pg-core";

// 1. Schools Table
export const schools = pgTable("schools", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  subdomain: text("subdomain").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  stripeCustomerId: text("stripe_customer_id"),
  stripeSubscriptionId: text("stripe_subscription_id"),
  subscriptionStatus: text("subscription_status"),
  logoUrl: text("logo_url"),
  themeColor: text("theme_color"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 2. Profiles Table (Linked to auth.users)
export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(), // PK matched to auth.users.id
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  role: text("role").notNull(), // 'admin' | 'teacher' | 'student'
  fullName: text("full_name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expoPushToken: text("expo_push_token"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 3. Teachers Table
export const teachers = pgTable("teachers", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  userId: uuid("user_id"), // Nullable initially, linked to auth.users.id
  fullName: text("full_name").notNull(),
  branch: text("branch").notNull(),
  status: text("status").notNull().default("active"), // 'active' | 'on_leave' | 'inactive'
  activeClassCount: integer("active_class_count").notNull().default(0),
  monthlyHours: numeric("monthly_hours", { precision: 8, scale: 2 }).notNull().default("0.00"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 4. Students Table
export const students = pgTable("students", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  userId: uuid("user_id"),
  fullName: text("full_name").notNull(),
  password: text("password"), // To store raw password for admin viewing
  parentPhone: text("parent_phone"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 5. Classes Table
export const classes = pgTable("classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  levelCode: text("level_code").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 6. Class Enrollments Table
export const classEnrollments = pgTable("class_enrollments", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  classId: uuid("class_id").notNull().references(() => classes.id),
  studentId: uuid("student_id").notNull().references(() => students.id),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 7. Schedule Slots Table
export const scheduleSlots = pgTable("schedule_slots", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  classId: uuid("class_id").notNull().references(() => classes.id),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id),
  roomName: text("room_name").notNull(),
  dayOfWeek: integer("day_of_week").notNull(), // 0 to 6
  startTime: time("start_time").notNull(),
  endTime: time("end_time").notNull(),
  status: text("status").notNull().default("scheduled"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 8. Lesson Sessions Table
export const lessonSessions = pgTable("lesson_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  scheduleSlotId: uuid("schedule_slot_id").notNull().references(() => scheduleSlots.id),
  sessionDate: date("session_date").notNull(),
  status: text("status").notNull().default("scheduled"), // 'scheduled' | 'ongoing' | 'in_progress' | 'completed' | 'late' | 'no_show'
  studentCount: integer("student_count").notNull().default(0),
  isActive: boolean("is_active").notNull().default(true),
  checkinAt: timestamp("checkin_at", { withTimezone: true }),
  checkoutAt: timestamp("checkout_at", { withTimezone: true }),
  teacherId: uuid("teacher_id").references(() => teachers.id), // Reassigned teacher if substituted
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 9. Hour Logs Table
export const hourLogs = pgTable("hour_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id),
  lessonSessionId: uuid("lesson_session_id").references(() => lessonSessions.id),
  hours: numeric("hours", { precision: 6, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"), // 'pending' | 'approved' | 'rejected'
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  auditTrail: jsonb("audit_trail").notNull().default([]), // Array of audit entries
  logDate: date("log_date"),
  classType: text("class_type"), // 'group' | 'private' | 'online'
  loggedAt: timestamp("logged_at", { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 10. Alerts Table
export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  type: text("type").notNull(), // 'late_check_in' | 'substitute_request' | 'no_show' | 'hour_approval' | 'other'
  teacherId: uuid("teacher_id").references(() => teachers.id),
  title: text("title").notNull(),
  description: text("description").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull().defaultNow(),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: uuid("resolved_by"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 11. Invitations Table
export const invitations = pgTable("invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  email: text("email").notNull(),
  role: text("role").notNull(), // 'admin' | 'teacher' | 'student'
  tokenHash: text("token_hash").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  acceptedAt: timestamp("accepted_at", { withTimezone: true }),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// 12. Substitute Requests Table
export const substituteRequests = pgTable("substitute_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  lessonSessionId: uuid("lesson_session_id").notNull().references(() => lessonSessions.id),
  requestingTeacherId: uuid("requesting_teacher_id").notNull().references(() => teachers.id),
  coveringTeacherId: uuid("covering_teacher_id").references(() => teachers.id),
  status: text("status").notNull().default("pending"), // 'pending' | 'accepted' | 'declined'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 13. Student Logs Table
export const studentLogs = pgTable("student_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  lessonSessionId: uuid("lesson_session_id").notNull().references(() => lessonSessions.id),
  studentId: uuid("student_id").notNull().references(() => students.id),
  status: text("status").notNull(), // 'present' | 'absent' | 'late'
  notes: text("notes"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 14. Progress Reports Table
export const progressReports = pgTable("progress_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  studentId: uuid("student_id").notNull().references(() => students.id),
  teacherId: uuid("teacher_id").notNull().references(() => teachers.id),
  levelCode: text("level_code").notNull(),
  scoreListening: integer("score_listening").notNull(),
  scoreSpeaking: integer("score_speaking").notNull(),
  scoreOverall: integer("score_overall").notNull(),
  notes: text("notes"),
  reportDate: date("report_date").notNull().defaultNow(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// 15. Classrooms Table
export const classrooms = pgTable("classrooms", {
  id: uuid("id").primaryKey().defaultRandom(),
  schoolId: uuid("school_id").notNull().references(() => schools.id),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});