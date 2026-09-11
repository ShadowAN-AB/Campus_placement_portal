export type Role = "student" | "recruiter" | "admin";

export type ApplicationStatus = "pending" | "shortlisted" | "rejected" | "interview";

export type InterviewStatus = "scheduled" | "completed" | "cancelled";

export type ResumeStatus = "uploaded" | "parsing" | "extracted" | "analyzed" | "failed";

export type AuthUser = {
  userId: string;
  email: string;
  role: Role;
};

export const QUEUE_EVENTS = "placecell-events";

export const EventTypes = {
  ApplicationApplied: "application.applied",
  ApplicationStatus: "application.status",
  JobApproved: "job.approved",
  JobChanged: "job.changed",
  ProfileUpdated: "profile.updated",
  ResumeUploaded: "resume.uploaded",
  ResumeAnalyzed: "resume.analyzed",
  InterviewScheduled: "interview.scheduled",
  InterviewRescheduled: "interview.rescheduled",
  InterviewCancelled: "interview.cancelled",
  AnalyticsRollup: "analytics.rollup",
} as const;
