import { ExecutionContext } from "@nestjs/common";

function skipUnless(needles: string[], methods?: string[]) {
  return (context: ExecutionContext) => {
    const req = context.switchToHttp().getRequest<{ url?: string; method?: string }>();
    const path = (req.url ?? "").split("?")[0];
    if (methods && !methods.includes((req.method ?? "GET").toUpperCase())) return true;
    return !needles.some((n) => path === n || path.startsWith(`${n}/`));
  };
}

export const NAMED_THROTTLERS = [
  { name: "default", ttl: 60_000, limit: 120 },
  { name: "login", ttl: 900_000, limit: 10, skipIf: skipUnless(["/v1/auth/login"], ["POST"]) },
  { name: "signup", ttl: 3_600_000, limit: 20, skipIf: skipUnless(["/v1/auth/signup"], ["POST"]) },
  {
    name: "reset",
    ttl: 3_600_000,
    limit: 5,
    skipIf: skipUnless(["/v1/auth/forgot-password", "/v1/auth/reset-password"], ["POST"]),
  },
  {
    name: "analyze",
    ttl: 86_400_000,
    limit: 20,
    skipIf: skipUnless(["/v1/resumes", "/v1/ai/ask"], ["POST"]),
  },
];
