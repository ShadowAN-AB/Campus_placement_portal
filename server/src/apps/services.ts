export const SERVICE_PORTS = {
  identity: 5051,
  catalog: 5052,
  applications: 5053,
  matching: 5054,
  interviews: 5055,
  notifications: 5056,
  analytics: 5057,
} as const;

export type FeatureService = keyof typeof SERVICE_PORTS;

export const SERVICE_PREFIXES: { prefix: string; service: FeatureService }[] = [
  { prefix: "/v1/admin/analytics", service: "analytics" },
  { prefix: "/v1/admin", service: "catalog" },
  { prefix: "/v1/applications", service: "applications" },
  { prefix: "/v1/interviews", service: "interviews" },
  { prefix: "/v1/notifications", service: "notifications" },
  { prefix: "/v1/resumes", service: "matching" },
  { prefix: "/v1/fit", service: "matching" },
  { prefix: "/v1/ai", service: "matching" },
  { prefix: "/v1/auth", service: "identity" },
  { prefix: "/v1/jobs", service: "catalog" },
  { prefix: "/v1/profile", service: "catalog" },
];

export const FEATURE_SERVICES = Object.keys(SERVICE_PORTS) as FeatureService[];

export function resolveService(urlPath: string): FeatureService | null {
  const path = urlPath.split("?")[0] ?? urlPath;
  const hit = SERVICE_PREFIXES.find(({ prefix }) => path === prefix || path.startsWith(`${prefix}/`) || path.startsWith(`${prefix}?`));
  return hit?.service ?? null;
}
