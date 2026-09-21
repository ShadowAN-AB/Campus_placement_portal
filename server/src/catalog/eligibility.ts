export type EligibilityJob = {
  departments?: string[];
  minCgpa?: number;
  graduationYear?: number;
};

export type EligibilityProfile = {
  department?: string;
  cgpa?: number;
  graduationYear?: number;
};

export type Eligibility = {
  eligible: boolean;
  reasons: string[];
};

const norm = (value?: string) => value?.trim().toLowerCase() ?? "";

export function jobEligibility(job: EligibilityJob, profile: EligibilityProfile | null | undefined): Eligibility {
  const reasons: string[] = [];
  const departments = (job.departments ?? []).map(norm).filter(Boolean);
  if (departments.length) {
    const dept = norm(profile?.department);
    if (!dept) reasons.push("Add your department to apply");
    else if (!departments.includes(dept)) reasons.push(`Open to ${departments.join(", ")}`);
  }
  const minCgpa = Number(job.minCgpa ?? 0);
  if (minCgpa > 0) {
    const cgpa = Number(profile?.cgpa ?? 0);
    if (!cgpa) reasons.push(`Minimum CGPA ${minCgpa}`);
    else if (cgpa + 1e-9 < minCgpa) reasons.push(`Minimum CGPA ${minCgpa}`);
  }
  const year = Number(job.graduationYear ?? 0);
  if (year) {
    if (Number(profile?.graduationYear ?? 0) !== year) reasons.push(`Graduation year ${year}`);
  }
  return { eligible: reasons.length === 0, reasons };
}
