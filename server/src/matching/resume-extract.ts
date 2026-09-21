export type ResumeExtract = {
  skills: string[];
  education: { degree?: string; school?: string; year?: string }[];
  projects: { name?: string; description?: string; skills?: string[] }[];
  certifications: string[];
  yearsOfExperience: number;
};

function asStringArray(value: unknown, field: string) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`LLM resume JSON ${field} must be an array`);
  return value.map((item) => String(item).trim()).filter(Boolean);
}

function asObjectArray(value: unknown, field: string) {
  if (value == null) return [];
  if (!Array.isArray(value)) throw new Error(`LLM resume JSON ${field} must be an array`);
  return value.filter((item) => item && typeof item === "object" && !Array.isArray(item)) as Record<string, unknown>[];
}

export function parseResumeExtract(raw: string): ResumeExtract {
  const parsed = JSON.parse(raw.replace(/```json|```/g, "").trim()) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("LLM resume JSON must be an object");
  }
  const row = parsed as Record<string, unknown>;
  const years = Number(row.yearsOfExperience ?? 0);
  if (Number.isNaN(years)) throw new Error("LLM resume JSON yearsOfExperience must be a number");
  return {
    skills: asStringArray(row.skills, "skills").map((s) => s.toLowerCase()),
    education: asObjectArray(row.education, "education").map((item) => ({
      degree: item.degree != null ? String(item.degree) : undefined,
      school: item.school != null ? String(item.school) : undefined,
      year: item.year != null ? String(item.year) : undefined,
    })),
    projects: asObjectArray(row.projects, "projects").map((item) => ({
      name: item.name != null ? String(item.name) : undefined,
      description: item.description != null ? String(item.description) : undefined,
      skills: asStringArray(item.skills, "projects.skills"),
    })),
    certifications: asStringArray(row.certifications, "certifications"),
    yearsOfExperience: years,
  };
}
