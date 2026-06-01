function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  supabaseUrl: process.env.SUPABASE_URL ?? "",
  supabaseServiceKey: process.env.SUPABASE_SERVICE_KEY ?? "",
  devSchoolId:
    process.env.DEV_SCHOOL_ID ?? "a0000000-0000-4000-8000-000000000001",
  upstashRedisUrl: process.env.UPSTASH_REDIS_URL ?? "",
  upstashRedisToken: process.env.UPSTASH_REDIS_TOKEN ?? "",
  inngestEventKey: process.env.INNGEST_EVENT_KEY ?? "",
  inngestSigningKey: process.env.INNGEST_SIGNING_KEY ?? "",
};

export function hasSupabase(): boolean {
  return Boolean(env.supabaseUrl && env.supabaseServiceKey);
}

export function hasRedis(): boolean {
  return Boolean(env.upstashRedisUrl && env.upstashRedisToken);
}
