import { router } from "../trpc/trpc";
import { healthRouter } from "./health";
import { dashboardRouter } from "./dashboard";
import { teachersRouter } from "./teachers";
import { scheduleRouter } from "./schedule";
import { alertsRouter } from "./alerts";

export const appRouter = router({
  health: healthRouter,
  dashboard: dashboardRouter,
  teachers: teachersRouter,
  schedule: scheduleRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
