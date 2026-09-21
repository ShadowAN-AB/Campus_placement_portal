const DEV_JWT = "change-me-to-a-long-random-string";
const DEV_ADMIN = "change-me-too";

function parseLlmProvider(value: string | undefined) {
  if (value === "anthropic" || value === "regex") return value;
  return "ollama" as const;
}

function read() {
  const nodeEnv = process.env.NODE_ENV ?? "development";
  const isProd = nodeEnv === "production";
  const jwtSecret = process.env.JWT_SECRET ?? DEV_JWT;
  const adminSignupCode = process.env.ADMIN_SIGNUP_CODE ?? DEV_ADMIN;
  const mongodbUri = process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/placecell";

  if (isProd) {
    const missing: string[] = [];
    if (!process.env.JWT_SECRET || jwtSecret === DEV_JWT) missing.push("JWT_SECRET");
    if (!process.env.ADMIN_SIGNUP_CODE || adminSignupCode === DEV_ADMIN) missing.push("ADMIN_SIGNUP_CODE");
    if (!process.env.MONGODB_URI) missing.push("MONGODB_URI");
    if (missing.length) throw new Error(`Invalid production env: ${missing.join(", ")}`);
  }

  return {
    port: Number(process.env.PORT ?? 5050),
    nodeEnv,
    isProd,
    appUrl: process.env.APP_URL ?? "http://localhost:5173",
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    mongodbUri,
    redisUrl: process.env.REDIS_URL ?? "redis://127.0.0.1:6379",
    jwtSecret,
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? "15m",
    jwtRefreshTtlDays: Number(process.env.JWT_REFRESH_TTL_DAYS ?? 7),
    adminSignupCode,
    storageBackend: (process.env.STORAGE_BACKEND === "s3" ? "s3" : "disk") as "disk" | "s3",
    s3: {
      bucket: process.env.S3_BUCKET ?? "placecell-resumes",
      region: process.env.S3_REGION ?? "us-east-1",
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? "minio",
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "minio12345",
      endpoint: process.env.S3_ENDPOINT,
    },
    llmProvider: parseLlmProvider(process.env.LLM_PROVIDER),
    ollamaModel: process.env.OLLAMA_MODEL ?? "qwen2.5-coder",
    ollamaBaseUrl: process.env.OLLAMA_BASE_URL ?? "http://127.0.0.1:11434",
    anthropicApiKey: process.env.ANTHROPIC_API_KEY,
    anthropicModel: process.env.ANTHROPIC_MODEL ?? "claude-haiku-4-5-20251001",
    smtp: process.env.SMTP_HOST
      ? {
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT ?? 587),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        }
      : undefined,
    mailFrom: process.env.MAIL_FROM ?? "PlaceCell <no-reply@placecell.dev>",
  };
}

export const env = new Proxy({} as ReturnType<typeof read>, {
  get(_t, prop: string) {
    return (read() as Record<string, unknown>)[prop];
  },
});
