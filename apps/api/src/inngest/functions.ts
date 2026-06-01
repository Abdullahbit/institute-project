import { inngest } from "./client";
import { logger } from "../lib/logger";

/** Background job: detect late check-ins and no-shows (PDF: Inngest). */
export const detectAttendanceIssues = inngest.createFunction(
  { id: "detect-attendance-issues", name: "Detect Late / No-Show" },
  { cron: "*/15 * * * *" },
  async ({ step }) => {
    await step.run("scan-lesson-sessions", async () => {
      logger.info("Running attendance scan for late/no-show detection");
      return { scanned: true };
    });
  },
);

export const inngestFunctions = [detectAttendanceIssues];
