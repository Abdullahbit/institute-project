import { Inngest } from "inngest";
import { env } from "../lib/env";

export const inngest = new Inngest({
  id: "institute-platform-api",
  eventKey: env.inngestEventKey || undefined,
});
