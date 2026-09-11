export type MatchInput = {
  studentSkills: string[];
  requiredSkills: string[];
  studentMonths: number;
  requiredMonths: number;
  expectedSalary?: number;
  minSalary?: number;
  maxSalary?: number;
  education?: { degree?: string }[];
  projects?: unknown[];
};

export type MatchResult = {
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  explanation: string;
  factors?: { skills: number; experience: number; salary: number; education: number; projects: number };
};

const lower = (xs: string[]) => xs.map((s) => s.trim().toLowerCase()).filter(Boolean);

function skillParts(studentSkills: string[], requiredSkills: string[]) {
  const have = new Set(lower(studentSkills));
  const required = lower(requiredSkills);
  const matchedSkills = required.filter((s) => have.has(s));
  const missingSkills = required.filter((s) => !have.has(s));
  const skills = required.length === 0 ? 50 : (matchedSkills.length / required.length) * 100;
  return { matchedSkills, missingSkills, skills };
}

function experienceScore(studentMonths: number, requiredMonths: number) {
  if (!requiredMonths) return 70;
  if (studentMonths >= requiredMonths) return 100;
  return (studentMonths / requiredMonths) * 100;
}

function salaryScore(expected?: number, min?: number, max?: number) {
  if (!expected || (!min && !max)) return 50;
  const lo = min ?? 0;
  const hi = max ?? min ?? expected;
  if (expected >= lo && expected <= hi) return 100;
  if (expected < lo) return Math.max(0, 100 - ((lo - expected) / lo) * 100);
  return Math.max(0, 100 - ((expected - hi) / hi) * 50);
}

function educationScore(education?: { degree?: string }[]) {
  if (!education?.length) return 40;
  const blob = education.map((e) => (e.degree ?? "").toLowerCase()).join(" ");
  if (blob.includes("phd") || blob.includes("doctor")) return 100;
  if (blob.includes("master") || blob.includes("m.tech") || blob.includes("mtech") || blob.includes("mba")) return 85;
  if (blob.includes("bachelor") || blob.includes("b.tech") || blob.includes("btech") || blob.includes("b.e")) return 75;
  return 55;
}

function projectScore(projects?: unknown[]) {
  if (!projects?.length) return 30;
  if (projects.length >= 3) return 100;
  return projects.length * 35;
}

export function calculateMatchScore(input: MatchInput): MatchResult {
  const { matchedSkills, missingSkills, skills } = skillParts(input.studentSkills, input.requiredSkills);
  const experience = experienceScore(input.studentMonths, input.requiredMonths);
  const salary = salaryScore(input.expectedSalary, input.minSalary, input.maxSalary);
  const score = Math.round(skills * 0.7 + experience * 0.2 + salary * 0.1);
  return {
    score,
    matchedSkills,
    missingSkills,
    explanation: `Skills ${Math.round(skills)}, experience ${Math.round(experience)}, salary ${Math.round(salary)}`,
  };
}

export function calculateEnhancedMatchScore(input: MatchInput): MatchResult {
  const { matchedSkills, missingSkills, skills } = skillParts(input.studentSkills, input.requiredSkills);
  const experience = experienceScore(input.studentMonths, input.requiredMonths);
  const salary = salaryScore(input.expectedSalary, input.minSalary, input.maxSalary);
  const education = educationScore(input.education);
  const projects = projectScore(input.projects);
  const score = Math.round(skills * 0.55 + experience * 0.2 + salary * 0.1 + education * 0.1 + projects * 0.05);
  return {
    score,
    matchedSkills,
    missingSkills,
    explanation: `Enhanced fit ${score}`,
    factors: {
      skills: Math.round(skills),
      experience: Math.round(experience),
      salary: Math.round(salary),
      education: Math.round(education),
      projects: Math.round(projects),
    },
  };
}
