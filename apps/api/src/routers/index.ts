import { router } from "../trpc/trpc.js";
import { healthRouter } from "./health.js";
import { dashboardRouter } from "./dashboard.js";
import { teachersRouter } from "./teachers.js";
import { scheduleRouter } from "./schedule.js";
import { alertsRouter } from "./alerts.js";
import { adminRouter } from "./admin.js";
import { authRouter } from "./auth.js";
import { hoursRouter } from "./hours.js";
import { studentsRouter } from "./students.js";
import { classesRouter } from "./classes.js";
import { messagesRouter } from "./messages.js";
import { parentsRouter } from "./parents.js";

export const appRouter = router({
  health: healthRouter,
  dashboard: dashboardRouter,
  teachers: teachersRouter,
  schedule: scheduleRouter,
  alerts: alertsRouter,
  admin: adminRouter,
  auth: authRouter,
  hours: hoursRouter,
  students: studentsRouter,
  classes: classesRouter,
  messages: messagesRouter,
  parents: parentsRouter,
});

export type AppRouter = typeof appRouter;

